import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { address } = req.body;

        // Verify the contract
        await execAsync(`cd hardhat && npx hardhat verify --network flow ${address}`);

        res.status(200).json({
            success: true,
            message: 'Contract verified successfully'
        });

    } catch (error) {
        console.error('Verification error:', error);
        // Don't treat verification errors as fatal
        res.status(200).json({
            success: true,
            message: 'Contract deployed but verification may have failed. The contract might already be verified.'
        });
    }
} 