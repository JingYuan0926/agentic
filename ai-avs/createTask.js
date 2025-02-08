import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import 'dotenv/config';

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY not found in environment variables');
}

// Load AI keys
const aiKeys = JSON.parse(readFileSync('ai_keys.json', 'utf8'));
const AI_PRIVATE_KEY = aiKeys.privateKey;

// ABI with proper function signature
const abi = [
  'function createNewTask(bytes32 hashBeforeSign, bytes memory signature) external returns (tuple(bytes32 hashBeforeSign, bytes signature))',
  'function aiPublicKey() external view returns (address)'
];

async function main() {
  const contractAddress = '0x610c598A1B4BF710a10934EA47E4992a9897fad1';
  
  const provider = new ethers.JsonRpcProvider('https://ethereum-holesky.publicnode.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // AI wallet for signing
  const aiWallet = new ethers.Wallet(AI_PRIVATE_KEY);

  try {
    // Text to analyze (this stays local, never sent to chain)
    const textToAnalyze = "Explain what blockchain is in simple terms";
    
    // Create hash of content (hashBeforeSign)
    const hashBeforeSign = ethers.keccak256(ethers.toUtf8Bytes(textToAnalyze));
    console.log('Hash before sign:', hashBeforeSign);

    // Get AI signature of the hashBeforeSign
    const signature = await aiWallet.signMessage(ethers.getBytes(hashBeforeSign));
    console.log('AI Signature:', signature);

    console.log('📝 Submitting to chain...');
    console.log('Parameters:');
    console.log('- hashBeforeSign:', hashBeforeSign);
    console.log('- signature:', signature);
    
    // Send transaction with all required parameters
    const tx = await contract.createNewTask(
      hashBeforeSign,
      signature,
      {
        gasLimit: 500000
      }
    );

    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    console.log('✅ Task created successfully!');
    console.log('📜 Transaction hash:', tx.hash);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    if (error.transaction) {
      console.log('Transaction:', error.transaction);
    }
  }
}

main().catch(console.error);