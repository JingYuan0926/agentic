import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import 'dotenv/config';

if (!process.env.OPERATOR_PRIVATE_KEY) {
  throw new Error('OPERATOR_PRIVATE_KEY not found in environment variables');
}

// Load AI keys for verification
const aiKeys = JSON.parse(readFileSync('ai_keys.json', 'utf8'));
const AI_PUBLIC_ADDRESS = aiKeys.address;

// ABI matching MyServiceManager.sol exactly
const abi = [
  'function operatorRegistered(address) external view returns (bool)',
  'function aiPublicKey() external view returns (address)',
  'function respondToTask(tuple(bytes32 hashBeforeSign, bytes signature) task, uint32 referenceTaskIndex, string response, bytes signature) external',
  'event NewTaskCreated(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task)',
  'event TaskResponded(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task, string response, address operator)'
];

// Function to verify AI signature
async function verifyAISignature(hashBeforeSign, signature, contract) {
  try {
    // Get AI public key from contract
    const aiPublicKey = await contract.aiPublicKey();
    
    // Recover the signer's address from the signature
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(hashBeforeSign),
      signature
    );
    
    // Compare with the AI public key from the contract
    const isValid = recoveredAddress.toLowerCase() === aiPublicKey.toLowerCase();
    
    console.log('🔍 Signature Verification:');
    console.log('- Hash before sign:', hashBeforeSign);
    console.log('- Signature:', signature);
    console.log('- Recovered signer:', recoveredAddress);
    console.log('- Contract AI address:', aiPublicKey);
    console.log('- Is valid:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification failed:', error);
    return false;
  }
}

async function main() {
  const contractAddress = '0x610c598A1B4BF710a10934EA47E4992a9897fad1';
  
  // Use WebSocket provider for reliable event listening
  const provider = new ethers.WebSocketProvider('wss://ethereum-holesky.publicnode.com');
  const wallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Check operator registration
  const isRegistered = await contract.operatorRegistered(wallet.address);
  console.log('Checking operator registration for:', wallet.address);
  if (!isRegistered) {
    console.error('❌ Operator not registered. Please register first.');
    process.exit(1);
  }
  console.log('✅ Operator registered and authorized');

  console.log('🚀 Starting operator service...');
  console.log('Waiting for tasks to verify...');

  // Listen for new tasks
  contract.on('NewTaskCreated', async (taskIndex, task) => {
    console.log('\n📥 New task received:', {
      index: taskIndex,
      hashBeforeSign: task.hashBeforeSign
    });

    try {
      // Verify AI signature using contract's public key
      const isVerified = await verifyAISignature(task.hashBeforeSign, task.signature, contract);

      // Create operator's signature of the verification result
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['bool', 'bytes32'],
          [isVerified, task.hashBeforeSign]
        )
      );
      const operatorSignature = await wallet.signMessage(ethers.getBytes(messageHash));

      console.log('📤 Submitting verification:');
      console.log('- Task index:', taskIndex);
      console.log('- Verification result:', isVerified);

      const tx = await contract.respondToTask(
        {
          hashBeforeSign: task.hashBeforeSign,
          signature: task.signature
        },
        taskIndex,
        isVerified ? "Verified" : "Not Verified",
        operatorSignature,
        {
          gasLimit: 500000
        }
      );

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Verification submitted! Transaction:', tx.hash);
    } catch (error) {
      console.error('❌ Error processing task:', error);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Transaction data:', error.transaction.data);
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Stopping task watcher...');
    provider.destroy();
    process.exit();
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 