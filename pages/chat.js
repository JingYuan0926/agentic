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

    const getContractContext = async (abi) => {
        try {
            // Store contract interface details in localStorage
            const functions = abi.filter(item => item.type === 'function').map(func => ({
                name: func.name,
                inputs: func.inputs,
                outputs: func.outputs,
                stateMutability: func.stateMutability
            }));

            const contractContext = {
                functions,
                lastInteraction: Date.now()
            };

            localStorage.setItem('contractContext', JSON.stringify(contractContext));
            return contractContext;
        } catch (error) {
            console.error('Error parsing contract context:', error);
            return null;
        }
    };

    const callContractFunction = async (functionDetails) => {
        try {
            if (!signer || !contractAddress || !contractABI) {
                return {
                    success: false,
                    message: "I notice the contract isn't connected yet. Could you please provide the contract address you'd like to interact with?"
                };
            }

            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            const { name, params, value } = functionDetails;

            let result;
            try {
                if (value) {
                    // Handle payable functions
                    result = await contract[name]({
                        value: ethers.parseEther(value.toString())
                    });
                } else {
                    // Handle regular functions
                    result = await contract[name](...(params || []));
                }

                if (result.wait) {
                    await result.wait();
                    return {
                        success: true,
                        message: `Transaction completed successfully! ${value ? `Deposited ${value} FLOW.` : ''}`
                    };
                }

                return {
                    success: true,
                    message: `Current value: ${result.toString()}`
                };
            } catch (error) {
                // Handle specific error cases
                if (error.message.includes('insufficient funds')) {
                    return {
                        success: false,
                        message: "I noticed you don't have enough FLOW in your wallet for this transaction. Please make sure you have enough funds and try again."
                    };
                }
                if (error.message.includes('user rejected')) {
                    return {
                        success: false,
                        message: "I see you declined the transaction. No worries! Let me know if you'd like to try again."
                    };
                }
                return {
                    success: false,
                    message: "I encountered an issue while trying to execute that action. Could you please try again or rephrase your request?"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "I'm having trouble understanding how to interact with this contract. Could you please verify the contract address and try again?"
            };
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        if (!walletAddress) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "I notice you're not connected yet. Please connect your wallet first using the green button above, and then I'll help you interact with the contract." 
            }]);
            return;
        }

        setIsLoading(true);
        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            // First, try to understand user intent via AI
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    contractABI,
                    contractAddress,
                    context: {
                        lastInteraction: localStorage.getItem('lastInteraction'),
                        contractContext: localStorage.getItem('contractContext')
                    }
                }),
            });

            const data = await response.json();
            
            // Handle new contract connection
            if (data.contractAddress && !contractABI) {
                const abi = await getABI(data.contractAddress);
                if (abi) {
                    setContractABI(abi);
                    setContractAddress(data.contractAddress);
                    localStorage.setItem('contractContext', JSON.stringify({
                        abi,
                        address: data.contractAddress,
                        timestamp: Date.now()
                    }));
                    
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: `I've successfully connected to the contract at ${data.contractAddress}. I can help you interact with it - just tell me what you'd like to do in plain English!` 
                    }]);
                } else {
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: "I had trouble verifying that contract address. Could you please double-check it and try again?" 
                    }]);
                }
                return;
            }

            // Handle function execution
            if (data.functionCall) {
                const result = await callContractFunction(data.functionCall);
                
                // Store interaction context
                localStorage.setItem('lastInteraction', JSON.stringify({
                    function: data.functionCall,
                    timestamp: Date.now()
                }));

                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: result.message
                }]);

                if (!result.success && data.alternativeSuggestion) {
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: data.alternativeSuggestion
                    }]);
                }
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: data.content || "I'm not quite sure what you'd like to do with the contract. Could you please rephrase your request?" 
                }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I encountered an unexpected issue. Could you please try rephrasing your request?"
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