import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { address } = req.body;

        // Verify using hardhat-verify with specific flags for Blockscout
        const verifyCommand = `cd hardhat && npx hardhat verify --network flow ${address} --contract contracts/Contract.sol:Contract`;
        console.log('Executing verification command:', verifyCommand);
        
        const { stdout, stderr } = await execAsync(verifyCommand);
        console.log('Verification stdout:', stdout);
        if (stderr) console.error('Verification stderr:', stderr);

        // Check for various success messages that Blockscout might return
        if (stdout.includes('Successfully verified') || 
            stdout.includes('Already verified') || 
            stdout.includes('Contract source code already verified')) {
            res.status(200).json({
                success: true,
                message: 'Contract verified successfully',
                explorerUrl: `https://evm-testnet.flowscan.io/address/${address}#code`
            });
        } else {
            // If verification fails, try without the contract parameter
            console.log('Trying alternative verification method...');
            const { stdout: stdout2 } = await execAsync(`cd hardhat && npx hardhat verify --network flow ${address}`);
            
            if (stdout2.includes('Successfully verified') || 
                stdout2.includes('Already verified') || 
                stdout2.includes('Contract source code already verified')) {
                res.status(200).json({
                    success: true,
                    message: 'Contract verified successfully (alternative method)',
                    explorerUrl: `https://evm-testnet.flowscan.io/address/${address}#code`
                });
            } else {
                throw new Error('Verification failed with both methods');
            }
        }

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Contract verification failed. Please check the contract on FlowScan.',
            explorerUrl: `https://evm-testnet.flowscan.io/address/${req.body.address}#code`
        });
    }
} 