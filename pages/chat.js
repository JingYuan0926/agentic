import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [teamUpdates, setTeamUpdates] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [walletBalance, setWalletBalance] = useState('');
    const [contractAddress, setContractAddress] = useState('');
    const [contractABI, setContractABI] = useState(null);
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);
    
    const chatBoxRef = useRef(null);
    const updateBoxRef = useRef(null);

    // Add new state variables for contract interaction
    const [deployedAddress, setDeployedAddress] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
    const [codeyStorage, setCodeyStorage] = useState([]);
    const [isContractConnected, setIsContractConnected] = useState(false);
    const [connectedContract, setConnectedContract] = useState('');

    // Clear localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.clear(); // Clear all storage on reload
            loadHistory();
        }
    }, []);

    // Auto-scroll chat boxes
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
        if (updateBoxRef.current) {
            updateBoxRef.current.scrollTop = updateBoxRef.current.scrollHeight;
        }
    }, [messages, teamUpdates]);

    const loadHistory = () => {
        if (typeof window !== 'undefined') {
            const chatHistory = localStorage.getItem('chatHistory');
            const updates = localStorage.getItem('teamUpdates');
            if (chatHistory) setMessages(JSON.parse(chatHistory));
            if (updates) setTeamUpdates(JSON.parse(updates));
        }
    };

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask!');
            }

            addMessage('system', 'Connecting to MetaMask...');

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
                            rpcUrls: ['https://flow-testnet.g.alchemy.com/v2/your-api-key'],
                            blockExplorerUrls: ['https://evm-testnet.flowscan.io']
                        }]
                    });
                }
            }

            const balance = await provider.getBalance(address);
            const formattedBalance = ethers.formatEther(balance);
            setWalletBalance(formattedBalance);

            addMessage('system', `Connected to MetaMask: ${address}`);
            addMessage('system', `Balance: ${formattedBalance} FLOW`);

        } catch (error) {
            console.error('Connection error:', error);
            addMessage('system', `Error: ${error.message}`);
        }
    };

    const addMessage = (role, content, agent = null) => {
        const newMessage = {
            role,
            content,
            agent,
            timestamp: Date.now()
        };
        setMessages(prev => {
            const updated = [...prev, newMessage];
            localStorage.setItem('chatHistory', JSON.stringify(updated));
            return updated;
        });
    };

    const addTeamUpdate = (agent, update) => {
        const newUpdate = {
            agent,
            update,
            timestamp: Date.now()
        };
        setTeamUpdates(prev => {
            const updated = [...prev, newUpdate];
            localStorage.setItem('teamUpdates', JSON.stringify(updated));
            return updated;
        });
    };

    // Handle contract connection status
    const handleContractConnection = (address) => {
        setIsContractConnected(true);
        setConnectedContract(address);
    };

    // Handle contract disconnection
    const handleDisconnectContract = () => {
        setIsContractConnected(false);
        setConnectedContract('');
        addTeamUpdate('System', 'Disconnected from contract. Finn is back online.');
    };

    // Update handleSendMessage to properly structure the data for Dex
    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = input.trim();
        setInput('');
        addMessage('user', userMessage);

        try {
            // When not connected, route through Finn first
            if (!isContractConnected) {
                const finnResponse = await fetch('/api/finn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: userMessage
                    })
                });

                const finnData = await finnResponse.json();
                addMessage('assistant', finnData.teamResponse, 'Finn');

                // If Finn detects contract generation request
                if (finnData.intent === 'generate') {
                    try {
                        const response = await fetch('/api/codey', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                message: userMessage
                            })
                        });

                        // Use stream reading like in codeytest.js
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
                                    addMessage('assistant', eventData.status, 'Codey');

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

                        // Deploy contract
                        addMessage('assistant', 'Deploying contract...', 'Codey');
                        const factory = new ethers.ContractFactory(
                            contractData.abi,
                            contractData.bytecode,
                            signer
                        );

                        const contract = await factory.deploy({
                            gasLimit: 3000000
                        });

                        addMessage('assistant', 'Waiting for deployment confirmation...', 'Codey');
                        await contract.waitForDeployment();
                        const address = await contract.getAddress();

                        // Wait for a few blocks
                        const receipt = await contract.deploymentTransaction().wait(2);
                        addMessage('assistant', `Contract deployed to: ${address}`, 'Codey');

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
                            addMessage('assistant', `Contract verified! View on FlowScan: ${verifyData.explorerUrl}`, 'Codey');
                            addMessage('assistant', `To interact with this contract, please provide the contract address: ${address}`, 'Codey');
                        } else {
                            addMessage('assistant', `Verification note: ${verifyData.message}`, 'Codey');
                        }

                    } catch (error) {
                        console.error('Codey error:', error);
                        addMessage('system', `Error: ${error.message}`, 'System');
                    }
                }
                // If Finn detects contract connection request
                else if (finnData.intent === 'connect' && finnData.contractAddress) {
                    setConnectedContract(finnData.contractAddress);
                    setIsContractConnected(true);
                    addTeamUpdate('System', `Connected to contract ${finnData.contractAddress}`);
                    
                    // Pass to Vee for initial analysis
                    const veeResponse = await fetch('/api/vee', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            messages,
                            userQuery: userMessage,
                            context: { contractAddress: finnData.contractAddress }
                        })
                    });
                    const veeData = await veeResponse.json();
                    if (veeData.message) {
                        addMessage('assistant', veeData.message, 'Vee');
                    }
                }
            } 
            // When connected, bypass Finn and go straight to Vee
            else {
                const veeResponse = await fetch('/api/vee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        messages,
                        userQuery: userMessage,
                        context: { contractAddress: connectedContract }
                    })
                });

                const veeData = await veeResponse.json();
                if (veeData.message) {
                    addMessage('assistant', veeData.message, 'Vee');
                }

                // Continue with Dex if Vee identified a function
                if (veeData.success && veeData.function) {
                    addMessage('assistant', `Preparing to execute ${veeData.function.name}...`, 'Dex');
                    
                    // Structure the function info properly for Dex
                    const functionInfo = {
                        name: veeData.function.name,
                        inputs: veeData.function.inputs || [],
                        outputs: veeData.function.outputs || [],
                        stateMutability: veeData.function.stateMutability
                    };

                    // Call Dex with properly structured data
                    const dexResponse = await fetch('/api/dex', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages,
                            userQuery: userMessage,
                            functionInfo: functionInfo,
                            contractAddress: connectedContract
                        })
                    });

                    if (!dexResponse.ok) {
                        const errorData = await dexResponse.json();
                        console.error('Dex API Error:', errorData);
                        throw new Error(errorData.message || 'Failed to process parameters');
                    }

                    const dexData = await dexResponse.json();
                    console.log('Dex Response:', dexData); // Debug log

                    if (dexData.teamUpdates) {
                        dexData.teamUpdates.forEach(update => addTeamUpdate('Dex', update));
                    }

                    // Execute the function if parameters were extracted successfully
                    if (dexData.success && dexData.params) {
                        addMessage('assistant', 
                            `Executing ${functionInfo.name} with parameters: ${JSON.stringify(dexData.params)}`, 
                            'Dex'
                        );
                        
                        const executionResult = await executeContractFunction(
                            functionInfo,
                            dexData.params
                        );

                        addMessage('assistant', executionResult.message, 'Dex');
                    } else {
                        addMessage('assistant', 
                            dexData.message || 'Failed to extract parameters', 
                            'Dex'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('system', `Error: ${error.message}`, 'System');
        } finally {
            setIsLoading(false);
        }
    };

    // Update executeContractFunction to handle the structured data
    const executeContractFunction = async (functionInfo, params) => {
        try {
            if (!signer || !connectedContract) {
                throw new Error('Contract or signer not initialized');
            }

            console.log('Function execution details:', {
                functionInfo,
                params,
                contractAddress: connectedContract
            });

            // Create minimal ABI array with just the function we need
            const minimalABI = [{
                name: functionInfo.name,
                type: 'function',
                inputs: functionInfo.inputs,
                outputs: functionInfo.outputs,
                stateMutability: functionInfo.stateMutability
            }];

            const contract = new ethers.Contract(connectedContract, minimalABI, signer);

            // Handle payable functions
            let txOptions = {};
            let processedParams = [];

            if (functionInfo.stateMutability === 'payable') {
                const amount = params.amount || Object.values(params)[0];
                txOptions = { value: ethers.parseEther(amount.toString()) };
                console.log('Payable transaction:', { amount, wei: txOptions.value.toString() });
            } else {
                processedParams = Object.values(params);
            }

            // Execute the function
            const tx = await contract[functionInfo.name](
                ...processedParams,
                txOptions
            );

            addMessage('assistant', 'Transaction submitted. Waiting for confirmation...', 'Dex');
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                message: `Transaction successful! Hash: ${receipt.hash}`,
                hash: receipt.hash
            };

        } catch (error) {
            console.error('Contract execution error:', error);
            return {
                success: false,
                message: `Error: ${error.reason || error.message}`
            };
        }
    };

    return (
        <div className="flex h-screen p-4 gap-4">
            {/* Chat Box - Left Side */}
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">Chat with AI Team</h2>
                        <div className="relative flex items-center gap-2">
                            <div 
                                className={`w-3 h-3 rounded-full ${
                                    isContractConnected 
                                        ? 'bg-green-500' 
                                        : 'bg-amber-500'
                                }`}
                                title={isContractConnected 
                                    ? `Connected to ${connectedContract}` 
                                    : 'No contract connected'
                                }
                            />
                            {isContractConnected && (
                                <button
                                    onClick={handleDisconnectContract}
                                    className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Disconnect
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Wallet Connection */}
                <div className="mb-4">
                    <button
                        onClick={connectWallet}
                        className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                    >
                        {walletAddress 
                            ? `Connected: ${walletBalance} FLOW` 
                            : 'Connect Wallet'}
                    </button>
                </div>

                {/* Messages */}
                <div 
                    ref={chatBoxRef}
                    className="flex-1 overflow-y-auto mb-4 border rounded p-4 bg-gray-50"
                >
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`mb-4 p-3 rounded ${
                                msg.role === 'user'
                                    ? 'bg-blue-100 ml-auto max-w-[80%]'
                                    : msg.role === 'assistant'
                                    ? 'bg-white max-w-[80%]'
                                    : 'bg-gray-200 max-w-[80%] text-sm'
                            }`}
                        >
                            {msg.agent && <div className="text-xs font-bold mb-1">{msg.agent}</div>}
                            {msg.content}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="text-gray-500 italic">Processing...</div>
                    )}
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
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
            </div>

            {/* Team Updates - Right Side */}
            <div className="w-1/3">
                <h2 className="text-xl font-bold mb-4">Team Updates</h2>
                <div 
                    ref={updateBoxRef}
                    className="h-[calc(100vh-8rem)] overflow-y-auto border rounded p-4 bg-gray-50"
                >
                    {teamUpdates.map((update, index) => (
                        <div key={index} className="mb-4 p-3 rounded bg-white">
                            <div className="font-bold text-sm mb-1">{update.agent}</div>
                            <div className="text-sm">{update.update}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {new Date(update.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
