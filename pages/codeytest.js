import { useState } from 'react';
import { ethers } from 'ethers';

export default function CodeyTest() {
    const [walletAddress, setWalletAddress] = useState('');
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deployedAddress, setDeployedAddress] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);

    // Helper function to add logs
    const addLog = (message) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Connect wallet function
    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask!');
            }

            addLog('Connecting to MetaMask...');

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            setWalletAddress(address);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);

            // Switch to Flow Testnet
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x221' }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x221',
                            chainName: 'Flow Testnet',
                            nativeCurrency: {
                                name: 'FLOW',
                                symbol: 'FLOW',
                                decimals: 18
                            },
                            rpcUrls: ['https://flow-testnet.g.alchemy.com/v2/6U7t79S89NhHIspqDQ7oKGRWp5ZOfsNj'],
                            blockExplorerUrls: ['https://evm-testnet.flowscan.io']
                        }]
                    });
                }
            }

            const balance = await provider.getBalance(address);
            const formattedBalance = ethers.formatEther(balance);
            addLog(`Wallet connected: ${address}`);
            addLog(`Balance: ${formattedBalance} FLOW`);

        } catch (error) {
            addLog(`Error: ${error.message}`);
            console.error('Connection error:', error);
        }
    };

    // Test function that uses Codey API
    const testCodey = async () => {
        if (!signer) {
            addLog('Please connect your wallet first');
            return;
        }

        try {
            setIsLoading(true);
            addLog('Starting contract generation...');

            // Test prompt for a simple contract
            const testPrompt = "Create a simple counter contract that can increment and decrement a number. Add events for tracking changes.";

            // Call Codey API to generate and compile contract
            const response = await fetch('/api/codey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: testPrompt
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let contractData = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() && line.startsWith('data: ')) {
                        const eventData = JSON.parse(line.slice(6));
                        addLog(eventData.status);

                        if (eventData.abi && eventData.bytecode) {
                            contractData = eventData;
                        }

                        if (eventData.error) {
                            throw new Error(eventData.status);
                        }
                    }
                }
            }

            if (!contractData) {
                throw new Error('Failed to receive contract data');
            }

            // Deploy contract using ethers.js
            addLog('Deploying contract...');
            const factory = new ethers.ContractFactory(
                contractData.abi,
                contractData.bytecode,
                signer
            );

            const contract = await factory.deploy({
                gasLimit: 3000000
            });

            addLog('Waiting for deployment confirmation...');
            await contract.waitForDeployment();
            const address = await contract.getAddress();
            setDeployedAddress(address);
            addLog(`Contract deployed to: ${address}`);

            // Wait for a few blocks
            const receipt = await contract.deploymentTransaction().wait(2);
            addLog('Deployment confirmed. Starting verification...');

            // Wait before verification
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify contract
            const verifyResponse = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: address,
                    contractCode: contractData.contractCode
                })
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
                setVerificationStatus('Contract verified successfully!');
                addLog(`Contract verified! View on FlowScan: ${verifyData.explorerUrl}`);
            } else {
                setVerificationStatus('Verification may need manual checking');
                addLog(`Verification note: ${verifyData.message}`);
            }

        } catch (error) {
            addLog(`Error: ${error.message}`);
            console.error('Test error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Wallet Connection */}
            <div className="mb-4">
                <button
                    onClick={connectWallet}
                    disabled={!!walletAddress}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                    {walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
                </button>
                {walletAddress && (
                    <p className="mt-2 text-sm">Connected: {walletAddress}</p>
                )}
            </div>

            {/* Test Button */}
            <div className="mb-4">
                <button
                    onClick={testCodey}
                    disabled={isLoading || !walletAddress}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {isLoading ? 'Testing...' : 'Run Test'}
                </button>
            </div>

            {/* Deployment Status */}
            {deployedAddress && (
                <div className="mb-4 p-4 bg-green-100 rounded">
                    <h2 className="font-bold">Deployed Contract:</h2>
                    <p className="break-all">{deployedAddress}</p>
                </div>
            )}

            {/* Verification Status */}
            {verificationStatus && (
                <div className="mb-4 p-4 bg-blue-100 rounded">
                    <h2 className="font-bold">Verification Status:</h2>
                    <p>{verificationStatus}</p>
                </div>
            )}

            {/* Logs */}
            <div className="mt-4">
                <h2 className="font-bold mb-2">Logs:</h2>
                <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
                    {logs.map((log, index) => (
                        <div key={index} className="text-sm mb-1">
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 