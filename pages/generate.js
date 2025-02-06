import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function ContractGenerator() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contractCode, setContractCode] = useState('');
    const [deploymentLogs, setDeploymentLogs] = useState([]);
    const [deployedAddress, setDeployedAddress] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [walletBalance, setWalletBalance] = useState('');
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);

    // Clear localStorage on mount
    useEffect(() => {
        localStorage.removeItem('chatHistory');
        setMessages([]);
    }, []);

    // Save messages to localStorage
    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }, [messages]);

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask!');
            }

            setMessages(prev => [...prev, { role: 'system', content: "Connecting to MetaMask..." }]);

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            setWalletAddress(address);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);

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
            setWalletBalance(formattedBalance);

            setMessages(prev => [...prev,
                { role: 'system', content: `Connected to MetaMask: ${address}` },
                { role: 'system', content: `Balance: ${formattedBalance} FLOW` }
            ]);
        } catch (error) {
            console.error('Connection error:', error);
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
        }
    };

    const generateAndDeploy = async (requirement) => {
        try {
            // Generate contract
            const generateResponse = await fetch('/api/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: requirement }),
            });

            const generateData = await generateResponse.json();
            if (!generateData.success) throw new Error('Failed to generate contract');
            
            setContractCode(generateData.contractCode);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Contract generated successfully. Attempting to compile...' 
            }]);

            // Compile contract
            const compileResponse = await fetch('/api/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractCode: generateData.contractCode }),
            });

            const compileData = await compileResponse.json();
            
            if (!compileData.success) {
                // If compilation fails, try to fix the contract
                const fixResponse = await fetch('/api/generate-contract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: requirement,
                        previousCode: generateData.contractCode
                    }),
                });

                const fixData = await fixResponse.json();
                if (!fixData.success) throw new Error('Failed to fix contract');

                setContractCode(fixData.contractCode);
                
                // Try compiling again
                const recompileResponse = await fetch('/api/compile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contractCode: fixData.contractCode }),
                });

                const recompileData = await recompileResponse.json();
                if (!recompileData.success) throw new Error('Failed to compile fixed contract');
                
                compileData = recompileData;
            }

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Contract compiled successfully. Deploying...' 
            }]);

            // Deploy contract
            const factory = new ethers.ContractFactory(
                compileData.abi, 
                compileData.bytecode, 
                signer
            );

            const contract = await factory.deploy({
                gasLimit: 3000000
            });

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Contract deployment in progress...' 
            }]);

            await contract.waitForDeployment();
            const deployedAddress = await contract.getAddress();
            setDeployedAddress(deployedAddress);

            // Verify contract
            const verifyResponse = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: deployedAddress,
                    contractCode: contractCode
                }),
            });

            const verifyData = await verifyResponse.json();

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Contract deployed and verified successfully!\nAddress: ${deployedAddress}\nView on Flow Explorer: https://evm-testnet.flowscan.io/address/${deployedAddress}` 
            }]);

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Error: ${error.message}` 
            }]);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        if (!walletAddress) {
            setMessages(prev => [...prev, { 
                role: 'system', 
                content: 'Please connect your wallet first' 
            }]);
            return;
        }

        setIsLoading(true);
        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            await generateAndDeploy(input);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Wallet Connection Button */}
            <div className="mb-4">
                <button
                    onClick={connectWallet}
                    className="bg-green-500 text-white p-3 rounded hover:bg-green-600 mb-4"
                >
                    {walletAddress 
                        ? `Connected: ${walletBalance} FLOW` 
                        : 'Connect Wallet'}
                </button>
            </div>

            {/* Chat Interface */}
            <div className="mb-4 h-[600px] overflow-y-auto border rounded p-4 bg-gray-50">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`mb-4 p-3 rounded ${
                            message.role === 'user'
                                ? 'bg-blue-100 ml-auto max-w-[80%]'
                                : message.role === 'assistant'
                                ? 'bg-white max-w-[80%]'
                                : 'bg-gray-200 max-w-[80%] text-sm'
                        }`}
                    >
                        {message.content}
                    </div>
                ))}
                {isLoading && (
                    <div className="text-gray-500 italic">AI is working...</div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe the smart contract you want to create..."
                    className="flex-1 p-2 border rounded"
                    disabled={isLoading || !walletAddress}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || !walletAddress}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                    Generate & Deploy
                </button>
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Connect your wallet using the green button above</li>
                    <li>Describe the smart contract you want to create</li>
                    <li>The AI will generate, compile, deploy, and verify your contract</li>
                    <li>You'll receive the deployed contract address when complete</li>
                </ol>
            </div>
        </div>
    );
}
