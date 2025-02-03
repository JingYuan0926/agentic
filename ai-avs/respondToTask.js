import { ethers } from 'ethers';
import ollama from 'ollama';
import 'dotenv/config';

if (!process.env.OPERATOR_PRIVATE_KEY) {
  throw new Error('OPERATOR_PRIVATE_KEY not found in environment variables');
}

const abi = [
  'function respondToTask((string contents, uint32 taskCreatedBlock) task, uint32 referenceTaskIndex, string response, bytes memory signature) external',
  'event NewTaskCreated(uint32 indexed taskIndex, (string contents, uint32 taskCreatedBlock) task)',
  'function operatorRegistered(address) external view returns (bool)'
];

async function createSignature(wallet, response, contents) {
  const messageHash = ethers.solidityPackedKeccak256(
    ['string', 'string'],
    [response, contents]
  );
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  return signature;
}

async function main() {
  const contractAddress = '0xDe1e04366D466bd9605447c9536fc0c907DCfB55';
  
  // Use WebSocket provider for reliable event listening
  const wsProvider = new ethers.WebSocketProvider('wss://ethereum-holesky.publicnode.com');
  const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, wsProvider);
  const contract = new ethers.Contract(contractAddress, abi, operatorWallet);

  console.log('🚀 Starting operator service...');
  console.log('Operator address:', operatorWallet.address);

  // First verify operator is registered
  try {
    const isRegistered = await contract.operatorRegistered(operatorWallet.address);
    if (!isRegistered) {
      console.error('❌ Operator is not registered!');
      process.exit(1);
    }
    console.log('✅ Operator is registered');
  } catch (error) {
    console.error('❌ Failed to check operator status:', error);
    process.exit(1);
  }

  // Test LLM connection
  try {
    console.log('Testing LLM connection...');
    const testResponse = await ollama.chat({
      model: 'deepseek-r1:1.5b',
      messages: [{ role: 'user', content: 'test' }]
    });
    console.log('✅ LLM is working');
  } catch (error) {
    console.error('❌ LLM test failed:', error);
    process.exit(1);
  }
  
  // Listen for new tasks
  contract.on('NewTaskCreated', async (taskIndex, task) => {
    console.log('\n📥 New task received:', {
      index: taskIndex,
      text: task.contents,
      blockNumber: task.taskCreatedBlock
    });

    try {
      // Get AI response
      console.log('🤖 Asking DeepSeek to analyze:', task.contents);
      const response = await ollama.chat({
        model: 'deepseek-r1:1.5b',
        messages: [{ role: 'user', content: task.contents }]
      });

      const finalResponse = response.message.content.split('</think>')[1]?.trim() || response.message.content;
      console.log('✨ DeepSeek response:', finalResponse);
      
      // Create signature and submit response
      console.log('📤 Submitting response to blockchain...');
      const signature = await createSignature(operatorWallet, finalResponse, task.contents);

      const taskStruct = {
        contents: task.contents,
        taskCreatedBlock: Number(task.taskCreatedBlock)
      };

      console.log('Sending response with params:', {
        task: taskStruct,
        taskIndex: Number(taskIndex),
        response: finalResponse,
        signature
      });

      // Submit with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          const tx = await contract.respondToTask(
            taskStruct,
            taskIndex,
            finalResponse,
            signature,
            {
              gasLimit: 500000
            }
          );

          console.log('⏳ Waiting for confirmation...');
          const receipt = await tx.wait();
          console.log('✅ Response submitted! Transaction:', tx.hash);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw error;
          }
          console.log(`Retrying... ${retries} attempts left`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('❌ Error processing task:', error);
      console.error('Error details:', error.error || error);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Stopping task watcher...');
    wsProvider.destroy();
    process.exit();
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 