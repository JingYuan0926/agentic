import fs from 'fs';
import path from 'path';
import solc from 'solc';

export default function handler(req, res) {
    try {
        // Read the contract file
        const contractPath = path.join(process.cwd(), 'temp', 'contract.sol');
        const sourceCode = fs.readFileSync(contractPath, 'utf8');

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
                evmVersion: "shanghai",
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };

        const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));
        const contract = compiledContract.contracts['contract.sol'].ExclusiveFund;

        res.status(200).json({
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            sourceCode,
            contractName: 'ExclusiveFund'
        });
    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({ error: error.message });
    }
} 