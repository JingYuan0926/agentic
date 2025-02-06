import fs from 'fs';
import path from 'path';
import solc from 'solc';

export default function handler(req, res) {
    try {
        // Read the contract file
        const contractPath = path.join(process.cwd(), 'temp', 'contract.sol');
        if (!fs.existsSync(contractPath)) {
            throw new Error('Contract file not found');
        }
        
        const sourceCode = fs.readFileSync(contractPath, 'utf8');
        console.log('Source code loaded:', sourceCode.substring(0, 100) + '...');

        const input = {
            language: 'Solidity',
            sources: {
                'contract.sol': {
                    content: sourceCode
                }
            },
            settings: {
                optimizer: {
                    enabled: false,
                    runs: 200
                },
                evmVersion: "london",
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };

        console.log('Compiling with settings:', JSON.stringify(input.settings, null, 2));
        
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        
        // Check for compilation errors
        if (output.errors) {
            const errors = output.errors.filter(error => error.severity === 'error');
            if (errors.length > 0) {
                console.error('Compilation errors:', errors);
                throw new Error(errors[0].message);
            }
        }

        const contract = output.contracts['contract.sol'].ExclusiveFund;
        if (!contract) {
            throw new Error('Contract not found in compilation output');
        }

        console.log('Compilation successful');
        
        res.status(200).json({
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            sourceCode,
            contractName: 'ExclusiveFund'
        });
    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({ 
            error: error.message || 'Compilation failed',
            details: error.toString()
        });
    }
} 