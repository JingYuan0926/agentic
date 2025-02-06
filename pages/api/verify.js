import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { address, contractCode } = req.body;

        // Verify the contract with explicit parameters
        const verifyCommand = `cd hardhat && npx hardhat verify --network flow ${address} --contract contracts/Counter.sol:Counter --constructor-args ""`;
        
        console.log('Executing verification command:', verifyCommand);
        
        const { stdout, stderr } = await execAsync(verifyCommand);
        console.log('Verification stdout:', stdout);
        if (stderr) console.error('Verification stderr:', stderr);

        // Check if verification was successful
        if (stdout.includes('Successfully verified') || stdout.includes('Already verified')) {
            res.status(200).json({
                success: true,
                message: 'Contract verified successfully',
                details: stdout
            });
        } else {
            throw new Error('Verification failed: ' + stdout);
        }

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Contract verification failed. Please verify manually on FlowScan.'
        });
    }
} 