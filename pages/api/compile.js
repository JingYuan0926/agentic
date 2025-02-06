import { writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';

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

        console.log('Starting compilation process...');
        
        // Compile with detailed output
        const { stdout, stderr } = await execAsync('cd hardhat && npx hardhat compile --force');
        console.log('Compilation stdout:', stdout);
        if (stderr) console.error('Compilation stderr:', stderr);

        // Read the compiled artifacts
        const artifactsPath = path.join(process.cwd(), 'hardhat/artifacts/contracts/Counter.sol/Counter.json');
        
        if (!existsSync(artifactsPath)) {
            console.error('Artifacts not found at:', artifactsPath);
            throw new Error(`Compilation artifacts not found at expected path: ${artifactsPath}`);
        }

        const artifactsContent = await readFile(artifactsPath, 'utf8');
        const artifacts = JSON.parse(artifactsContent);

        // Return the ABI and bytecode
        res.status(200).json({
            success: true,
            abi: artifacts.abi,
            bytecode: artifacts.bytecode,
            message: 'Compilation successful'
        });

    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
} 