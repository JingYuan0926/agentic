import { useState } from 'react';
import { ethers } from 'ethers';
import { useNetworkSwitch } from '../hooks/useNetworkSwitch';

export default function Deploy() {
    const [contract, setContract] = useState(null);
    const [deployedAddress, setDeployedAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { switchToSepolia } = useNetworkSwitch();

    const compileContract = async () => {
        try {
            const response = await fetch('/api/compile-contract');
            if (!response.ok) {
                throw new Error('Compilation failed');
            }
            return await response.json();
        } catch (err) {
            console.error('Compilation error:', err);
            throw err;
        }
    };

    const deployContract = async () => {
        try {
            setLoading(true);
            setError('');
            
            await switchToSepolia();
            
            const { abi, bytecode } = await compileContract();
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            console.log('Starting contract deployment...');
            console.log('Deployment parameters:', {
                contractName: 'ExclusiveFund',
                compilerVersion: 'v0.8.20+commit.a1b79de6',
                optimizerEnabled: false,
                optimizerRuns: 200,
                evmVersion: 'london',
                licenseType: 'MIT'
            });

            const factory = new ethers.ContractFactory(abi, bytecode, signer);
            const deployedContract = await factory.deploy();
            
            // Wait for deployment with 2 confirmations
            console.log('Waiting for deployment confirmations...');
            await deployedContract.waitForDeployment();
            const receipt = await deployedContract.deploymentTransaction().wait(2);
            
            const contractAddress = await deployedContract.getAddress();
            console.log('Contract deployed at:', contractAddress);
            console.log('Transaction hash:', receipt.hash);
            
            // Save to localStorage
            localStorage.setItem('contractABI', JSON.stringify(abi));
            localStorage.setItem('contractAddress', contractAddress);
            
            setContract(deployedContract);
            setDeployedAddress(contractAddress);
            
        } catch (err) {
            console.error('Deployment error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Deploy Smart Contract to Sepolia</h1>
                
                <div className="mb-8 p-4 bg-gray-100 rounded">
                    <h2 className="text-xl font-semibold mb-4">Deployment Parameters</h2>
                    <ul className="space-y-2">
                        <li><strong>Contract Name:</strong> ExclusiveFund</li>
                        <li><strong>Compiler Version:</strong> v0.8.20+commit.a1b79de6</li>
                        <li><strong>Optimizer:</strong> Disabled</li>
                        <li><strong>Optimizer Runs:</strong> 200</li>
                        <li><strong>EVM Version:</strong> London</li>
                        <li><strong>License:</strong> MIT</li>
                    </ul>
                </div>

                <button
                    onClick={deployContract}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {loading ? 'Deploying...' : 'Deploy Contract'}
                </button>

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {deployedAddress && (
                    <div className="mt-4">
                        <h2 className="text-xl font-semibold mb-2">
                            Deployed Contract on Sepolia
                        </h2>
                        <p className="font-mono bg-gray-100 p-4 rounded break-all">
                            {deployedAddress}
                        </p>
                        <div className="mt-2 space-y-2">
                            <a 
                                href={`https://sepolia.etherscan.io/address/${deployedAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 block"
                            >
                                View on Etherscan
                            </a>
                            <p className="text-sm text-gray-600">
                                Contract ABI and address have been saved to localStorage
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 