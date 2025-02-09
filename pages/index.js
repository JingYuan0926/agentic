'use client'
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import { NilQLWrapper } from 'nillion-sv-wrappers';
import { BrowserProvider, Contract } from 'ethers';
import OnChainProof from '../components/OnChainProof';
import { useNetworkSwitch } from '../hooks/useNetworkSwitch';

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
    const { walletProvider } = useWeb3ModalProvider();
    const { open } = useWeb3Modal();

    // Add error state for consistency with nillion-test.js
    const [error, setError] = useState('');

    // Add new state for client-side rendering
    const [isClient, setIsClient] = useState(false);

    // Add new state for chat history (keep all other existing state)
    const [chatHistory, setChatHistory] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(Date.now().toString());

    // Add nilQL wrapper state
    const [nilQLWrapper, setNilQLWrapper] = useState(null);

    // Add refresh trigger for chat history
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Add new state for transaction popup
    const [txPopup, setTxPopup] = useState(null);

    // Add network switch state
    const { switchToFlow } = useNetworkSwitch();

    // Handle client-side initialization
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Move wallet connection check to useEffect
    useEffect(() => {
        if (isClient && isConnected && address && walletProvider) {
            loadChatHistory();
        }
    }, [isClient, isConnected, address, walletProvider]);

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

    // Modify loadChatHistory to properly handle async operations
    const loadChatHistory = async () => {
        if (!isConnected || !address || !nilQLWrapper) return;
        
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'readAll',
                    walletAddress: address
                }),
            });

            if (!response.ok) throw new Error('Failed to load chat history');
            
            const data = await response.json();
            console.log('📖 Read Result:', data);
            
            if (Array.isArray(data)) {
                const processMessage = async (item) => {
                    if (item.walletAddress !== address) return null;
                    
                    try {
                        const messageData = JSON.parse(item.message);
                        const chatId = messageData.chatId || item.chatId;
                        
                        let content = messageData.content;
                        if (content && content.$allot) {
                            content = await decryptMessage(content);
                        }

                        return {
                            chatId,
                            message: {
                                role: messageData.role,
                                content: content,
                                agent: messageData.agent,
                                timestamp: messageData.timestamp
                            },
                            timestamp: new Date(item.timestamp).getTime(),
                            walletAddress: item.walletAddress
                        };
                    } catch (e) {
                        console.error('Failed to parse message:', e);
                        return null;
                    }
                };

                // Process all messages in parallel
                const processedMessages = await Promise.all(data.map(processMessage));
                
                // Group messages by chatId
                const chatGroups = processedMessages.reduce((acc, item) => {
                    if (!item) return acc;
                    
                    if (!acc[item.chatId]) {
                        acc[item.chatId] = {
                            id: item.chatId,
                            messages: [],
                            timestamp: item.timestamp,
                            walletAddress: item.walletAddress
                        };
                    }
                    
                    acc[item.chatId].messages.push(item.message);
                    return acc;
                }, {});

                // Convert to array and sort by timestamp
                const sortedChats = Object.values(chatGroups)
                    .sort((a, b) => b.timestamp - a.timestamp);

                setChatHistory(sortedChats);
                
                // Set current chat if none selected
                if (sortedChats.length > 0 && !currentChatId) {
                    setCurrentChatId(sortedChats[0].id);
                    setMessages(sortedChats[0].messages);
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            addMessage('system', 'Failed to load chat history');
        }
    };

    const connectWallet = async () => {
        try {
            await open(); // This opens Web3Modal
            
            if (walletProvider) {
                const provider = new BrowserProvider(walletProvider);
                const signer = await provider.getSigner();
                setProvider(provider);
                setSigner(signer);

                const balance = await provider.getBalance(address);
                const formattedBalance = ethers.formatEther(balance);
                setWalletBalance(formattedBalance);
                setWalletAddress(address);

                addMessage('system', `Connected to wallet: ${address}`);
                addMessage('system', `Balance: ${formattedBalance} FLOW`);
            }
        } catch (error) {
            console.error('Connection error:', error);
            addMessage('system', `Error: ${error.message}`);
        }
    };

    // Add an effect to handle connection changes
    useEffect(() => {
        if (isConnected && address && walletProvider) {
            const setupConnection = async () => {
                const provider = new BrowserProvider(walletProvider);
                const signer = await provider.getSigner();
                setProvider(provider);
                setSigner(signer);
            };
            setupConnection();
        }
    }, [isConnected, address, walletProvider]);

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

    // Modify addMessage function to include encryption
    const addMessage = async (role, content, agent = null) => {
        if (!isConnected || !address || !nilQLWrapper) return;
        
        try {
            const timestamp = Date.now();
            
            // Encrypt the content
            const encryptedContent = await nilQLWrapper.encrypt(content);
            console.log('🔒 Encrypting message...');

            const messageData = {
                role,
                content: { $allot: encryptedContent }, // Store encrypted content
                agent,
                timestamp,
                chatId: currentChatId || timestamp.toString()
            };

            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(messageData)
                }),
            });

            // Update error handling
            if (!response.ok) {
                console.error('Store error:', response.status);
                // Continue with local updates even if storage fails
            }
            
            // Update local state immediately
            const newMessage = { role, content, agent, timestamp };
            setMessages(prev => [...prev, newMessage]);

            // Update chat history if needed
            if (!currentChatId) {
                const newChatId = timestamp.toString();
                setCurrentChatId(newChatId);
                setChatHistory(prev => [{
                    id: newChatId,
                    messages: [newMessage],
                    timestamp,
                    walletAddress: address
                }, ...prev]);
            }

            console.log('💾 Message stored successfully');
            return messageData.chatId;
        } catch (error) {
            console.error('Message error:', error);
            // Still update local state even if there's an error
            const newMessage = { role, content, agent, timestamp: Date.now() };
            setMessages(prev => [...prev, newMessage]);
            throw error;
        }
    };

    // Add decryption helper function
    const decryptMessage = async (encryptedContent) => {
        try {
            if (encryptedContent && encryptedContent.$allot) {
                const decryptedContent = await nilQLWrapper.decrypt(encryptedContent.$allot);
                console.log('🔓 Message decrypted');
                return decryptedContent;
            }
            return encryptedContent; // Return as-is if not encrypted
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            return 'Encrypted message (cannot decrypt)';
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
                // Also update chat history
                setChatHistory(prev => prev.map(chat => ({
                    ...chat,
                    messages: chat.messages.filter(msg => msg.timestamp !== timestamp)
                })));
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
                        const deployedAddress = await contract.getAddress();  // Get address immediately

                        // Wait for a few blocks
                        const receipt = await contract.deploymentTransaction().wait(2);
                        addMessage('assistant', `Contract deployed to: ${deployedAddress}`, 'Codey');

                        // Set contract as connected
                        setConnectedContract(deployedAddress);
                        setIsContractConnected(true);
                        addTeamUpdate('System', `Connected to contract ${deployedAddress}`);

                        // Wait before verification
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        // Verify contract with the correct address
                        const verifyResponse = await fetch('/api/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                address: deployedAddress,  // Use deployedAddress consistently
                                contractCode: contractData.contractCode
                            })
                        });

                        const verifyData = await verifyResponse.json();
                        if (verifyData.success) {
                            addMessage('assistant', `Contract verified! View on FlowScan: ${verifyData.explorerUrl}`, 'Codey');
                            addMessage('assistant', `To interact with this contract, please provide the contract address: ${deployedAddress}`, 'Codey');
                        } else {
                            addMessage('assistant', `Verification note: ${verifyData.message}`, 'Codey');
                        }

                    } catch (error) {
                        console.error('Deployment error:', error);
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

    // Update executeContractFunction to match your previous working version
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

    // Add proper delete functionality
    const handleDeleteChat = async (chatId) => {
        if (!isConnected || !address) return;
        
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    walletAddress: address,
                    chatId: chatId
                }),
            });

            if (response.ok) {
                // Update local state
                setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
                if (currentChatId === chatId) {
                    setCurrentChatId(null);
                    setMessages([]);
                }
                console.log('🗑️ Chat deleted:', chatId);
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    // Add refresh trigger for chat history
    useEffect(() => {
        if (isClient && isConnected && address && nilQLWrapper) {
            loadChatHistory();
        }
    }, [isClient, isConnected, address, nilQLWrapper, refreshTrigger]);

    // Add delete button to chat messages and handle wallet disconnect
    useEffect(() => {
        if (!isConnected) {
            setMessages([]);
            setChatHistory([]);
            setCurrentChatId(null);
        }
    }, [isConnected]);

    const handleTransactionComplete = (txData) => {
        setTxPopup({
            createTaskHash: txData.createTaskHash,
            responseHash: txData.responseHash
        });
    };

    // Add new useEffect for network switching
    useEffect(() => {
        const checkAndSwitchNetwork = async () => {
            if (window.ethereum && signer) {
                const network = await window.ethereum.request({ method: 'eth_chainId' });
                if (network !== '0xc45') { // If not on Flow
                    await switchToFlow().catch(console.error);
                }
            }
        };
        checkAndSwitchNetwork();
    }, [signer]);

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
                            chat.id !== currentChatId && chat.messages?.length > 0 && (
                                <div 
                                    key={chat.id}
                                    className="relative group cursor-pointer hover:bg-gray-100 p-3 rounded mb-2"
                                >
                                    <div onClick={() => selectChat(chat.id)}>
                                        <div className="text-sm truncate">
                                            {chat.messages[0]?.content 
                                                ? chat.messages[0].content.substring(0, 30) + '...'
                                                : 'Empty message'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(chat.messages[0]?.timestamp || Date.now()).toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteChat(chat.id);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                                                 text-red-500 hover:text-red-700 transition-opacity"
                                        title="Delete chat"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
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
                                {messages.map((message, index) => (
                                    <div key={index} className="relative group">
                                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-lg ${
                                                message.role === 'user' 
                                                    ? 'bg-blue-500 text-white' 
                                                    : 'bg-gray-200'
                                            }`}>
                                                {message.content}
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleDeleteMessage(message.timestamp)}
                                            className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100
                                                     text-red-500 hover:text-red-700 transition-opacity"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
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

                    {/* Add this before the Input Area */}
                    <OnChainProof 
                        messages={messages} 
                        signer={signer} 
                        onTransactionComplete={handleTransactionComplete}
                    />

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

            {/* Transaction Popup */}
            {txPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                        <h3 className="text-lg font-bold mb-4">Transactions Complete!</h3>
                        <div className="space-y-2">
                            <p>Task Creation: <a 
                                href={`https://holesky.etherscan.io/tx/${txPopup.createTaskHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 underline"
                            >{txPopup.createTaskHash}</a></p>
                            <p>Operator Response: <a 
                                href={`https://holesky.etherscan.io/tx/${txPopup.responseHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 underline"
                            >{txPopup.responseHash}</a></p>
                        </div>
                        <button 
                            onClick={() => setTxPopup(null)}
                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Chat;
