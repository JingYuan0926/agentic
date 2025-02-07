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
    const [deploymentLogs, setDeploymentLogs] = useState([]);
    const [aiModel, setAiModel] = useState('openai'); // 'openai' or 'hyperbolic'

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

    const generateAndDeploy = async (requirement, endpoint) => {
        try {
            // Generate contract
            const generateResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: requirement }),
            });

            const generateData = await generateResponse.json();
            if (!generateData.success) {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: "I couldn't generate the contract. Could you please rephrase your requirements?" 
                }]);
                return false;
            }
            
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

            // Enhanced deployment with better error handling
            try {
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
                    content: 'Contract deployment initiated. Please confirm in MetaMask...' 
                }]);

                await contract.waitForDeployment();
                const deployedAddress = await contract.getAddress();

                // Store contract details in localStorage for persistence
                localStorage.setItem('contractDetails', JSON.stringify({
                    address: deployedAddress,
                    abi: compileData.abi,
                    code: contractCode,
                    timestamp: Date.now()
                }));

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

                // Store contract context for future interactions
                const contractContext = await getContractContext(compileData.abi);
                localStorage.setItem('contractContext', JSON.stringify(contractContext));

                return true;
            } catch (deployError) {
                handleDeploymentError(deployError);
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            handleGeneralError(error);
            return false;
        }
    };

    // New helper functions for better error handling
    const handleDeploymentError = (error) => {
        if (error.message.includes('insufficient funds')) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "You don't have enough FLOW tokens for deployment. Please get some FLOW and try again." 
            }]);
        } else if (error.message.includes('user rejected')) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "You rejected the transaction. Would you like to try deploying again?" 
            }]);
        } else {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Deployment failed: ${error.message}. Would you like to try again?` 
            }]);
        }
    };

    const handleGeneralError = (error) => {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `An error occurred: ${error.message}. Please try again or modify your request.` 
        }]);
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
            const functions = abi.filter(item => item.type === 'function').map(func => ({
                name: func.name,
                inputs: func.inputs,
                outputs: func.outputs,
                stateMutability: func.stateMutability
            }));

            return {
                functions,
                lastInteraction: Date.now()
            };
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
                    message: "Contract not properly initialized."
                };
            }

            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            const { name, params = [], value = null } = functionDetails;

            // Find exact function signature in ABI
            const abiFunction = contractABI.find(f => {
                if (f.type !== 'function' || f.name !== name) return false;
                return f.inputs.length === params.length;
            });

            if (!abiFunction) {
                return {
                    success: false,
                    message: `Function ${name} not found in contract ABI.`
                };
            }

            // Convert parameters based on their ABI types
            const convertedParams = params.map((param, index) => {
                const input = abiFunction.inputs[index];
                if (!input) return param;

                try {
                    if (input.type === 'uint256' || input.type === 'uint') {
                        const numericValue = parseFloat(param);
                        if (isNaN(numericValue)) {
                            throw new Error(`Invalid number: ${param}`);
                        }

                        // Check if parameter is likely to be an amount based on ABI context
                        const isAmountParam = input.name.toLowerCase().includes('amount') || 
                                            input.name.toLowerCase().includes('value') ||
                                            input.name.toLowerCase().includes('balance');
                        
                        if (isAmountParam) {
                            // Convert to raw value (no decimals)
                            const rawValue = BigInt(Math.floor(numericValue * 1e18));
                            console.log('Amount conversion:', {
                                original: numericValue,
                                converted: rawValue.toString()
                            });
                            return rawValue;
                        }
                        // For other uint parameters (like password)
                        return ethers.getBigInt(Math.floor(numericValue).toString());
                    }
                    if (input.type === 'address') {
                        return ethers.getAddress(param);
                    }
                    if (input.type === 'string') {
                        return param.toString();
                    }
                    return param;
                } catch (error) {
                    console.error(`Parameter conversion error:`, error);
                    throw error;
                }
            });

            // Handle value for payable functions
            const txOptions = {};
            if (abiFunction.stateMutability === 'payable' && params.length > 0) {
                const numericValue = parseFloat(params[0]);
                const rawValue = BigInt(Math.floor(numericValue * 1e18));
                txOptions.value = rawValue;
            }

            console.log('Contract call:', {
                function: name,
                originalParams: params,
                convertedParams: convertedParams.map(p => p.toString()),
                txOptions: txOptions.value ? txOptions.value.toString() : 'none'
            });

            const result = Object.keys(txOptions).length > 0
                ? await contract[name](...convertedParams, txOptions)
                : await contract[name](...convertedParams);

            if (result.wait) {
                await result.wait();
                const amount = params[0];
                return {
                    success: true,
                    message: `Transaction completed successfully! ${amount ? `${amount} FLOW.` : ''}`
                };
            }

            // For view functions, convert the result back from wei if it's a balance
            const formattedResult = result && abiFunction.outputs?.[0]?.type === 'uint256'
                ? ethers.formatEther(result)
                : result.toString();

            return {
                success: true,
                message: `Result: ${formattedResult}`
            };

        } catch (error) {
            console.error('Contract call error:', error);
            return {
                success: false,
                message: `Error: ${error.reason || error.message}`
            };
        }
    };

    // Helper function to check if string is numeric
    const isNumeric = (str) => {
        if (typeof str !== "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    };

    // New helper functions for contract interaction
    const shouldNotRetry = (error) => {
        return error.message.includes('user rejected') || 
               error.message.includes('insufficient funds') ||
               error.message.includes('invalid parameters');
    };

    const handleContractError = (error) => {
        if (error.message.includes('insufficient funds')) {
            return {
                success: false,
                message: "Insufficient FLOW in wallet for this transaction."
            };
        }
        if (error.message.includes('user rejected')) {
            return {
                success: false,
                message: "Transaction was rejected. Would you like to try again?"
            };
        }
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    };

    const storeInteraction = (functionName, params, value) => {
        const interactions = JSON.parse(localStorage.getItem('contractInteractions') || '[]');
        interactions.push({
            functionName,
            params,
            value,
            timestamp: Date.now()
        });
        localStorage.setItem('contractInteractions', JSON.stringify(interactions));
    };

    // Add this new function to analyze user intent
    const analyzeUserIntent = async (userMessage) => {
        try {
            const response = await fetch('/api/analyze-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    hasContract: !!contractABI,
                    contractAddress: contractAddress,
                    contractContext: contractABI ? await getContractContext(contractABI) : null
                }),
            });

            const { intent, actions } = await response.json();
            return { intent, actions };
        } catch (error) {
            console.error('Error analyzing intent:', error);
            return { intent: 'unknown', actions: [] };
        }
    };

    // Modify handleSendMessage to use intent analysis
    const handleSendMessage = async () => {
        if (!input.trim() || !walletAddress) return;
        
        setIsLoading(true);
        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            // Analyze user intent first
            const { intent, actions } = await analyzeUserIntent(input);
            console.log('Intent analysis:', { intent, actions }); // Debug log

            switch (intent) {
                case 'generate_contract':
                    const generateEndpoint = aiModel === 'openai' ? 
                        '/api/generate-contract' : 
                        '/api/h_generate-contract';
                    await generateAndDeploy(input, generateEndpoint);
                    break;

                case 'connect_contract':
                    const addressMatch = input.match(/0x[a-fA-F0-9]{40}/);
                    if (addressMatch) {
                        const address = addressMatch[0];
                        const abi = await getABI(address);
                        if (abi) {
                            setContractABI(abi);
                            setContractAddress(address);
                            localStorage.setItem('contractABI', JSON.stringify(abi));
                            localStorage.setItem('contractAddress', address);
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `Successfully connected to contract at ${address}. You can now interact with the contract.`
                            }]);
                        } else {
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: "Couldn't fetch the contract ABI. Please verify the contract address."
                            }]);
                        }
                    }
                    break;

                case 'execute_functions':
                    if (!contractABI || !contractAddress) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "Please connect to a contract first before trying to execute functions."
                        }]);
                        return;
                    }

                    if (!Array.isArray(actions) || actions.length === 0) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "I couldn't determine which function to call. Please specify the function more clearly."
                        }]);
                        return;
                    }

                    // Process function queue from actions
                    for (const action of actions) {
                        console.log('Executing action:', action); // Debug log
                        const result = await callContractFunction(action);
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: result.message
                        }]);
                        
                        // Store interaction in localStorage
                        const interactions = JSON.parse(localStorage.getItem('contractInteractions') || '[]');
                        interactions.push({
                            timestamp: Date.now(),
                            function: action.name,
                            params: action.params,
                            result: result.success
                        });
                        localStorage.setItem('contractInteractions', JSON.stringify(interactions));
                    }
                    break;

                default:
                    // Proceed with normal chat flow
                    const chatEndpoint = aiModel === 'openai' ? '/api/chat' : '/api/h_chat';
                    const response = await fetch(chatEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [...messages, userMessage],
                            contractABI,
                            contractAddress,
                            context: {
                                lastInteraction: localStorage.getItem('lastInteraction'),
                                contractContext: await getContractContext(contractABI)
                            }
                        }),
                    });

                    const data = await response.json();
                    setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            }
        } catch (error) {
            console.error('Error:', error);
            handleGeneralError(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load saved contract on mount (from int.js)
    useEffect(() => {
        const loadSavedContract = async () => {
            const savedContract = localStorage.getItem('contractDetails');
            if (savedContract) {
                try {
                    const { address, abi } = JSON.parse(savedContract);
                    setContractABI(abi);
                    setContractAddress(address);
                } catch (error) {
                    console.error('Error loading saved contract:', error);
                }
            }
        };

        loadSavedContract();
    }, []);

    // ... Rest of the JSX remains the same as in int.js, but update the instructions
    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Add model selector before wallet connection button */}
            <div className="mb-4">
                <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="p-2 border rounded mr-4"
                >
                    <option value="openai">OpenAI</option>
                    <option value="hyperbolic">Hyperbolic</option>
                </select>
                
                <button
                    onClick={connectWallet}
                    className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
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
                    <li>You can:
                        <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Generate a new contract by saying "Create a contract that..."</li>
                            <li>Interact with existing contract by saying "Connect to contract [address]"</li>
                        </ul>
                    </li>
                    <li>Follow the AI's instructions to interact with your contract</li>
                    <li>The AI will help you call functions and understand responses</li>
                </ol>
            </div>
        </div>
    );
}