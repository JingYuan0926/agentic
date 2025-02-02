import { useState } from 'react';
import { ethers } from 'ethers';
import { useNetworkSwitch } from '../hooks/useNetworkSwitch';

export default function Deploy() {
    const [contract, setContract] = useState(null);
    const [deployedAddress, setDeployedAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
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

    const verifyContract = async (address) => {
        try {
            console.log('Sending verification request...');
            const response = await fetch('/api/verify-contract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address }),
            });

            console.log('Got verification response:', response.status);
            const result = await response.json();
            console.log('Verification result:', result);
            
            if (!response.ok) {
                if (result.error === 'Contract not deployed yet') {
                    console.log('Contract not found, waiting 15s to retry...');
                    // Wait and retry once
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    return await verifyContract(address);
                }
                console.error('Verification error:', result);
                throw new Error(result.error || 'Verification failed');
            }

            // Update verification status based on the result
            if (result.result === 'Verified') {
                console.log('Contract verified successfully!');
                setVerificationStatus('Verified');
            } else if (result.result.startsWith('Failed:')) {
                console.log('Verification failed:', result.result);
                setVerificationStatus(result.result);
            } else {
                console.log('Verification pending:', result.result);
                setVerificationStatus('Pending verification');
            }

            return result;
        } catch (err) {
            console.error('Verification error details:', err);
            setVerificationStatus('Failed');
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
            const factory = new ethers.ContractFactory(abi, bytecode, signer);
            const deployedContract = await factory.deploy();
            
            // Wait for deployment with 2 confirmations
            console.log('Waiting for deployment confirmations...');
            await deployedContract.waitForDeployment();
            const receipt = await deployedContract.deploymentTransaction().wait(2);
            
            const contractAddress = await deployedContract.getAddress();
            console.log('Contract deployed at:', contractAddress);
            
            // Save to localStorage
            localStorage.setItem('contractABI', JSON.stringify(abi));
            localStorage.setItem('contractAddress', contractAddress);
            
            setContract(deployedContract);
            setDeployedAddress(contractAddress);
            
            console.log('Starting contract verification...');
            // Verify the contract immediately since we know it's deployed
            await verifyContract(contractAddress);
            
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
                
                <button
                    onClick={deployContract}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {loading ? 'Deploying & Verifying...' : 'Deploy Contract'}
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
                            {verificationStatus && ` (${verificationStatus})`}
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