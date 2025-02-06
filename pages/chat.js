import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function SmartContractChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contractCode, setContractCode] = useState('');
    const [contractABI, setContractABI] = useState(null);
    const [contractAddress, setContractAddress] = useState(null);
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);
    const [walletAddress, setWalletAddress] = useState('');
    const [walletBalance, setWalletBalance] = useState('');
    const [deployedAddress, setDeployedAddress] = useState(null);

    // Clear localStorage and reset state on mount
    useEffect(() => {
        localStorage.removeItem('chatHistory');
        setMessages([]);
        resetContractState();
    }, []);

    const resetContractState = () => {
        setContractCode('');
        setContractABI(null);
        setContractAddress(null);
        setSigner(null);
        setProvider(null);
        setDeployedAddress(null);
    };

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

            // Switch to Flow network
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

            let compileData = await compileResponse.json();
            
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

            // Set contract ABI and address for interaction
            setContractABI(compileData.abi);
            setContractAddress(deployedAddress);

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

            return true;
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Error: ${error.message}` 
            }]);
            return false;
        }
    };

    const getABI = async (address) => {
        try {
            const response = await fetch(`https://evm-testnet.flowscan.io/api/v2/smart-contracts/${address}`);
            if (!response.ok) throw new Error('Failed to fetch ABI');
            const data = await response.json();
            return data.abi;
        } catch (error) {
            console.error('Error fetching ABI:', error);
            return null;
        }
    };

    const callContractFunction = async (functionName, params = []) => {
        try {
            if (!signer || !contractAddress || !contractABI) {
                throw new Error('Contract or signer not initialized');
            }

            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            const result = await contract[functionName](...params);
            
            if (result.wait) {
                await result.wait();
                if (contract[`get${functionName}`]) {
                    const updatedValue = await contract[`get${functionName}`]();
                    return updatedValue.toString();
                }
                return 'Transaction successful';
            }
            
            return result.toString();
        } catch (error) {
            console.error('Error calling contract function:', error);
            throw error;
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
            // Check if this is a generation request
            if (input.toLowerCase().includes('create') || input.toLowerCase().includes('generate')) {
                await generateAndDeploy(input);
                return;
            }

            // Otherwise, handle as contract interaction
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    contractABI,
                    contractAddress
                }),
            });

            const data = await response.json();
            
            // Handle contract address detection
            if (data.contractAddress && !contractABI) {
                const abi = await getABI(data.contractAddress);
                setContractABI(abi);
                setContractAddress(data.contractAddress);
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `Connected to contract: ${data.contractAddress}. I can help you interact with this contract. What would you like to do?` 
                }]);
                return;
            }

            // Handle multiple function executions
            if (data.executeFunctions && data.executeFunctions.length > 0) {
                try {
                    let executionResults = [];
                    
                    // Execute each function sequentially
                    for (const func of data.executeFunctions) {
                        const result = await callContractFunction(
                            func.name,
                            func.params
                        );
                        executionResults.push({
                            functionName: func.name,
                            result: result
                        });
                    }
                    
                    // Let the AI interpret all results
                    const interpretResponse = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [
                                ...messages, 
                                userMessage,
                                {
                                    role: 'system',
                                    content: `Multiple functions were executed with results: ${JSON.stringify(executionResults)}`
                                }
                            ],
                            contractABI,
                            contractAddress
                        }),
                    });

                    const interpretData = await interpretResponse.json();
                    
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: interpretData.content
                    }]);
                } catch (error) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `Error executing functions: ${error.message}`
                    }]);
                }
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: data.content 
                }]);
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // ... Rest of the JSX remains the same as in int.js, but update the instructions
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
                    placeholder="Generate a contract or interact with existing one..."
                    className="flex-1 p-2 border rounded"
                    disabled={isLoading || !walletAddress}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || !walletAddress}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                    Send
                </button>
            </div>

            {/* Updated Instructions */}
            <div className="mt-8 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Connect your wallet using the green button above</li>
                    <li>To create a new contract: Type "Create a contract that..." or "Generate a contract for..."</li>
                    <li>To interact with existing contract: Enter "I want to interact with [contract address]"</li>
                    <li>Follow the AI's instructions to interact with your contract</li>
                </ol>
            </div>
        </div>
    );
}