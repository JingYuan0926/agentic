'use client'
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import { NilQLWrapper } from 'nillion-sv-wrappers';

// Create SSR-safe component
const Chat = dynamic(() => Promise.resolve(ChatComponent), {
    ssr: false
});

function ChatComponent() {
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

    const { address, isConnected } = useWeb3ModalAccount();

    // Add error state for consistency with nillion-test.js
    const [error, setError] = useState('');

    // Add new state for client-side rendering
    const [isClient, setIsClient] = useState(false);

    // Add new state for chat history (keep all other existing state)
    const [chatHistory, setChatHistory] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(Date.now().toString());

    // Add nilQL wrapper state
    const [nilQLWrapper, setNilQLWrapper] = useState(null);

    // Handle client-side initialization
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Move wallet connection check to useEffect
    useEffect(() => {
        if (isClient && isConnected && address) {
            loadChatHistory();
        }
    }, [isClient, isConnected, address]);

    // Auto-scroll chat boxes
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
        if (updateBoxRef.current) {
            updateBoxRef.current.scrollTop = updateBoxRef.current.scrollHeight;
        }
    }, [messages, teamUpdates]);

    // Initialize nilQL wrapper
    useEffect(() => {
        const initNilQL = async () => {
            const cluster = {
                nodes: [{}, {}, {}] // Three nodes for encryption
            };
            const wrapper = new NilQLWrapper(cluster);
            await wrapper.init();
            setNilQLWrapper(wrapper);
        };
        initNilQL();
    }, []);

    // Modify loadChatHistory to handle decryption
    const loadChatHistory = async () => {
        if (!isConnected || !address || !nilQLWrapper) return;
        
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'read',
                    walletAddress: address
                }),
            });

            if (!response.ok) throw new Error('Failed to load chat history');
            
            const data = await response.json();
            if (Array.isArray(data)) {
                // Group and decrypt messages
                const chats = {};
                
                for (const item of data) {
                    if (item.walletAddress !== address) continue;
                    
                    const message = JSON.parse(item.message);
                    const chatId = message.chatId || 'default';
                    
                    // Decrypt message content if encrypted
                    let decryptedMessage = { ...message };
                    if (message.content && typeof message.content === 'object' && message.content.$allot) {
                        try {
                            const decryptedContent = await nilQLWrapper.decrypt(message.content.$allot);
                            decryptedMessage.content = decryptedContent;
                        } catch (e) {
                            console.error('Failed to decrypt message:', e);
                            decryptedMessage.content = 'Encrypted message (cannot decrypt)';
                        }
                    }

                    if (!chats[chatId]) {
                        chats[chatId] = {
                            id: chatId,
                            messages: [],
                            timestamp: message.timestamp,
                            walletAddress: item.walletAddress
                        };
                    }
                    chats[chatId].messages.push(decryptedMessage);
                }

                const chatList = Object.values(chats)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .filter(chat => chat.walletAddress === address);

                setChatHistory(chatList);
                
                if (chatList.length > 0) {
                    setCurrentChatId(chatList[0].id);
                    setMessages(chatList[0].messages);
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            addMessage('system', 'Failed to load chat history');
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

    // Modify startNewChat to preserve old chat
    const startNewChat = () => {
        // Save current chat to history if it has messages
        if (messages.length > 0) {
            setChatHistory(prev => [{
                id: currentChatId,
                messages: [...messages],
                timestamp: Date.now()
            }, ...prev]);
        }

        // Start new chat
        const newChatId = Date.now().toString();
        setCurrentChatId(newChatId);
        setMessages([]);
    };

    // Add chat selection handler
    const selectChat = (chatId) => {
        const selectedChat = chatHistory.find(chat => chat.id === chatId);
        if (selectedChat) {
            setCurrentChatId(chatId);
            setMessages(selectedChat.messages);
        }
    };

    // Modify addMessage to include encryption
    const addMessage = async (role, content, agent = null) => {
        if (!isConnected || !address || !nilQLWrapper) return;

        const newMessage = {
            role,
            content,
            agent,
            timestamp: Date.now(),
            chatId: currentChatId || Date.now().toString(),
            walletAddress: address
        };

        try {
            // Encrypt the message content
            const shares = await nilQLWrapper.encrypt(content);
            const encryptedMessage = {
                ...newMessage,
                content: { $allot: shares } // Store encrypted shares
            };

            await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(encryptedMessage),
                    chatId: currentChatId
                }),
            });

            // Use unencrypted message for UI
            setMessages(prev => [...prev, newMessage]);
            
            if (!currentChatId) {
                const newChat = {
                    id: newMessage.chatId,
                    messages: [newMessage],
                    timestamp: newMessage.timestamp,
                    walletAddress: address
                };
                setChatHistory(prev => [newChat, ...prev]);
                setCurrentChatId(newMessage.chatId);
            }
        } catch (error) {
            console.error('Failed to store message:', error);
        }
    };

    // Modify addTeamUpdate to store in Nillion
    const addTeamUpdate = async (agent, update) => {
        if (!isConnected || !address) {
            console.error('Wallet not connected');
            return;
        }

        const newUpdate = {
            agent,
            update,
            timestamp: Date.now()
        };

        try {
            // Store in Nillion with a special suffix for updates
            await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: `${address}_updates`,
                    message: JSON.stringify(newUpdate)
                }),
            });

            setTeamUpdates(prev => [...prev, newUpdate]);
        } catch (error) {
            console.error('Failed to store team update:', error);
        }
    };

    // Add delete functionality
    const handleDeleteMessage = async (timestamp) => {
        if (!isConnected || !address) return;
        
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    walletAddress: address,
                    messageId: timestamp
                }),
            });

            if (response.ok) {
                setMessages(prev => prev.filter(msg => msg.timestamp !== timestamp));
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    // Add delete functionality for team updates
    const handleDeleteUpdate = async (timestamp) => {
        if (!isConnected || !address) return;
        
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    walletAddress: `${address}_updates`,
                    messageId: timestamp
                }),
            });

            if (response.ok) {
                setTeamUpdates(prev => prev.filter(update => update.timestamp !== timestamp));
            }
        } catch (error) {
            console.error('Failed to delete update:', error);
        }
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
            // Check for contract address in the message when not connected
            const addressMatch = userMessage.match(/0x[a-fA-F0-9]{40}/);
            if (!isContractConnected && addressMatch) {
                const contractAddress = addressMatch[0];
                
                // Set contract connection
                setConnectedContract(contractAddress);
                setIsContractConnected(true);
                addTeamUpdate('System', `Connected to contract ${contractAddress}`);
                addMessage('assistant', `Connected to contract ${contractAddress}. Passing to Vee for analysis...`, 'Finn');

                // Immediately pass to Vee for analysis
                const veeResponse = await fetch('/api/vee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userQuery: userMessage,
                        context: { contractAddress }
                    })
                });
                const veeData = await veeResponse.json();
                if (veeData.message) {
                    addMessage('assistant', veeData.message, 'Vee');
                }
                setIsLoading(false);
                return;
            }

            // When not connected and no address found, route through Finn
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

                // If Finn determines this is a generate request, pass to Codey
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

    // Fix contract deployment in executeContractFunction
    const executeContractFunction = async (functionInfo, params) => {
        try {
            if (!signer || !connectedContract) {
                throw new Error('Contract or signer not initialized');
            }

            const contract = new ethers.Contract(connectedContract, [functionInfo], signer);
            
            let tx;
            if (functionInfo.stateMutability === 'payable') {
                tx = await contract[functionInfo.name]({ value: params.value });
            } else if (Array.isArray(params)) {
                tx = await contract[functionInfo.name](...params);
            } else {
                tx = await contract[functionInfo.name]();
            }

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
        <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                {/* Chat History Sidebar */}
                <div className="w-64 bg-white shadow-md overflow-y-auto">
                    <div className="p-4">
                        <button
                            onClick={startNewChat}
                            className="w-full mb-4 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            New Chat
                        </button>
                        {/* Current Chat */}
                        {messages.length > 0 && (
                            <div className="cursor-pointer bg-blue-100 p-3 rounded mb-2">
                                <div className="text-sm truncate">
                                    {messages[0].content.substring(0, 30)}...
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(messages[0].timestamp).toLocaleDateString()}
                                </div>
                            </div>
                        )}
                        {/* Chat History */}
                        {chatHistory.map(chat => (
                            chat.id !== currentChatId && (
                                <div 
                                    key={chat.id}
                                    onClick={() => selectChat(chat.id)}
                                    className="cursor-pointer hover:bg-gray-100 p-3 rounded mb-2"
                                >
                                    <div className="text-sm truncate">
                                        {chat.messages[0].content.substring(0, 30)}...
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(chat.messages[0].timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Contract Connection Status */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                            <span className="text-sm text-gray-600">
                                {isContractConnected ? `Connected to ${connectedContract}` : 'No contract connected'}
                            </span>
                        </div>
                        {isContractConnected && (
                            <button
                                onClick={handleDisconnectContract}
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        {isClient && messages.length > 0 && (
                            <div className="space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`p-3 rounded max-w-[80%] ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-100 ml-auto' 
                                            : msg.role === 'assistant'
                                                ? 'bg-white'
                                                : 'bg-gray-100'
                                    }`}>
                                        {msg.agent && (
                                            <p className="text-xs font-semibold mb-1">{msg.agent}</p>
                                        )}
                                        <p className="text-sm">{msg.content}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isLoading && (
                            <div className="text-center py-4 text-gray-600">
                                Processing...
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t">
                        {!isConnected ? (
                            <div className="text-center py-4 text-gray-600">
                                Please connect your wallet to chat
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    className="flex-1 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Type your message here"
                                    rows="3"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !input.trim()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                                >
                                    Send
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chat;
