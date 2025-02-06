import { writeFile, readFile } from 'fs/promises';
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

        // Compile
        await execAsync('cd hardhat && npx hardhat compile');

        // Read the compiled artifacts
        const artifactsPath = path.join(process.cwd(), 'hardhat/artifacts/contracts/Counter.sol/Counter.json');
        const artifacts = JSON.parse(await readFile(artifactsPath, 'utf8'));

        // Return the ABI and bytecode
        res.status(200).json({
            success: true,
            abi: artifacts.abi,
            bytecode: artifacts.bytecode
        });

    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
} 