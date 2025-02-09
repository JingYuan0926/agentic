import { ethers } from 'ethers';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';

const WALLET_FILE_PATH = path.join(process.cwd(), 'hardhat/cache/wallet.json');

export default async function handler(req, res) {
    // Handle GET request to retrieve the stored address
    if (req.method === 'GET') {
        try {
            const data = await readFile(WALLET_FILE_PATH, 'utf8');
            const { address } = JSON.parse(data);
            
            if (!address) {
                return res.status(404).json({ 
                    error: 'No wallet address stored' 
                });
            }
            
            console.log('Returning stored address:', address);
            return res.status(200).json({ address });
        } catch (error) {
            console.log('No wallet file found or error reading file');
            return res.status(404).json({ 
                error: 'No wallet address stored' 
            });
        }
    }

    // Handle POST request to store the address
    if (req.method === 'POST') {
        try {
            const { address } = req.body;
            
            if (!address) {
                return res.status(400).json({ 
                    error: 'No wallet address provided' 
                });
            }

            // Validate the address
            if (!ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address format' 
                });
            }

            // Store the address in a JSON file
            await writeFile(
                WALLET_FILE_PATH, 
                JSON.stringify({ 
                    address,
                    timestamp: new Date().toISOString()
                }, null, 2)
            );
            
            console.log('Stored new address:', address);

            return res.status(200).json({ 
                address,
                message: 'Wallet address stored successfully' 
            });

        } catch (error) {
            console.error('Error handling wallet address:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }

    // Handle DELETE request to remove the stored address
    if (req.method === 'DELETE') {
        try {
            await unlink(WALLET_FILE_PATH);
            console.log('Wallet address file deleted');
            return res.status(200).json({ 
                message: 'Wallet address removed successfully' 
            });
        } catch (error) {
            console.error('Error deleting wallet file:', error);
            return res.status(404).json({ 
                error: 'No wallet address to delete' 
            });
        }
    }

    // Handle other HTTP methods
    return res.status(405).json({ message: 'Method not allowed' });
} 