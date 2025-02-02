import { useState } from 'react';
import { ethers } from 'ethers';

export default function Deploy() {
    const [contract, setContract] = useState(null);
    const [deployedAddress, setDeployedAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('Please install MetaMask to deploy contracts');
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Create provider and signer using ethers v6 syntax
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Compile the contract through API
            const compiledContract = await compileContract();
            
            // Create contract factory
            const factory = new ethers.ContractFactory(
                compiledContract.abi,
                compiledContract.bytecode,
                signer
            );

            // Deploy the contract
            const contract = await factory.deploy();
            await contract.waitForDeployment(); // Changed from deployed() to waitForDeployment()

            setDeployedAddress(await contract.getAddress()); // Changed from contract.address
            setContract(contract);
            setLoading(false);
        } catch (err) {
            console.error('Deployment error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Deploy Smart Contract</h1>
                
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
                        <h2 className="text-xl font-semibold mb-2">Deployed Contract:</h2>
                        <p className="font-mono bg-gray-100 p-4 rounded break-all">
                            {deployedAddress}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
} 