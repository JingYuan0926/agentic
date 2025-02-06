import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { contractCode } = req.body;

    // Write contract to file
    const contractPath = path.join(process.cwd(), 'hardhat/contracts/Counter.sol');
    await writeFile(contractPath, contractCode);
    
    // Send initial status
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Compile
    res.write(`data: ${JSON.stringify({ status: 'Compiling contract...', step: 1 })}\n\n`);
    await execAsync('cd hardhat && npx hardhat compile');

    // Deploy
    res.write(`data: ${JSON.stringify({ status: 'Deploying contract...', step: 2 })}\n\n`);
    const { stdout: deployOutput } = await execAsync('cd hardhat && npx hardhat run scripts/deploy.js --network flow');
    
    // Extract deployed address from the output
    const addressMatch = deployOutput.match(/Counter deployed to: (0x[a-fA-F0-9]{40})/);
    if (!addressMatch) {
      throw new Error('Could not extract deployed address from output');
    }
    
    const deployedAddress = addressMatch[1];
    res.write(`data: ${JSON.stringify({ 
      status: 'Contract deployed successfully!', 
      address: deployedAddress,
      step: 3 
    })}\n\n`);

    // Verify
    res.write(`data: ${JSON.stringify({ status: 'Verifying contract...', step: 4 })}\n\n`);
    try {
      await execAsync(`cd hardhat && npx hardhat verify --network flow ${deployedAddress} --force`);
      res.write(`data: ${JSON.stringify({ 
        status: 'Contract verified successfully!',
        step: 5,
        complete: true,
        deployedAddress 
      })}\n\n`);
    } catch (verifyError) {
      console.warn('Verification warning:', verifyError);
      res.write(`data: ${JSON.stringify({ 
        status: 'Contract deployed but verification failed. Contract may already be verified.',
        step: 5,
        complete: true,
        deployedAddress
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Deployment error:', error);
    res.write(`data: ${JSON.stringify({ 
      status: 'Error: ' + error.message,
      error: true
    })}\n\n`);
    res.end();
  }
} 