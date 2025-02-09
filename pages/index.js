'use client'
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import dynamic from 'next/dynamic';
import { NilQLWrapper } from 'nillion-sv-wrappers';
import { BrowserProvider, Contract } from 'ethers';
import OnChainProof from '../components/OnChainProof';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Textarea } from "@heroui/input";
import { FiMenu, FiSend } from 'react-icons/fi';
import Header from '../components/Header';
import AvatarGrid from '../components/AvatarGrid';

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

    // Add this near the top with other state declarations
    const [selectedModel, setSelectedModel] = useState('openai'); // 'openai' or 'hyperbolic'

    // Add this near the top of ChatComponent
    const FLOW_CHAIN_ID = '0x221';

    // Add this with other state declarations at the top
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);

    // Add state for chat history drawer
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Add this effect at the top level of your component
    useEffect(() => {
        const checkAndSwitchNetwork = async () => {
            if (window.ethereum && signer && !isGeneratingProof) {
                const network = await window.ethereum.request({ method: 'eth_chainId' });
                if (network !== FLOW_CHAIN_ID) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: FLOW_CHAIN_ID }],
                        });
                    } catch (switchError) {
                        if (switchError.code === 4902) {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: FLOW_CHAIN_ID,
                                    chainName: 'EVM on Flow (testnet)',
                                    nativeCurrency: {
                                        name: 'Flow Token',
                                        symbol: 'FLOW',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
                                    blockExplorerUrls: ['https://evm-testnet.flowscan.io']
                                }]
                            });
                        }
                    }
                }
            }
        };
        checkAndSwitchNetwork();
    }, [signer, isGeneratingProof]);

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
                        context: { contractAddress },
                        selectedModel
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
                        message: userMessage,
                        selectedModel
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
                                message: userMessage,
                                selectedModel
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
                                contractCode: contractData.contractCode,
                                selectedModel
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
                            context: { contractAddress: finnData.contractAddress },
                            selectedModel
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
                        context: { contractAddress: connectedContract },
                        selectedModel
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
                            contractAddress: connectedContract,
                            selectedModel
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

    // Keep your original executeContractFunction implementation
    const executeContractFunction = async (functionInfo, params) => {
        try {
            if (!signer || !connectedContract) {
                throw new Error('Contract or signer not initialized');
            }

            const minimalABI = [{
                name: functionInfo.name,
                type: 'function',
                inputs: functionInfo.inputs,
                outputs: functionInfo.outputs,
                stateMutability: functionInfo.stateMutability
            }];

            const contract = new ethers.Contract(connectedContract, minimalABI, signer);

            // For payable functions
            if (functionInfo.stateMutability === 'payable') {
                // Extract amount - params is now directly the amount string
                const amount = params;
                console.log('Deposit amount:', amount); // Debug log
                
                const tx = await contract[functionInfo.name]({
                    value: ethers.parseEther(amount),
                    gasLimit: 3000000
                });
                
                addMessage('assistant', 'Transaction submitted. Waiting for confirmation...', 'Dex');
                const receipt = await tx.wait();
                return {
                    success: true,
                    message: `Transaction successful! Hash: ${receipt.hash}`,
                    hash: receipt.hash
                };
            } else {
                // For non-payable functions
                const processedParams = Array.isArray(params) ? params : [params];
                const tx = await contract[functionInfo.name](...processedParams, {
                    gasLimit: 3000000
                });
                
                addMessage('assistant', 'Transaction submitted. Waiting for confirmation...', 'Dex');
                const receipt = await tx.wait();
                return {
                    success: true,
                    message: `Transaction successful! Hash: ${receipt.hash}`,
                    hash: receipt.hash
                };
            }

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

    return (
        <div className="flex flex-col h-screen">
            {/* Header spans full width */}
            <Header />
            
            <div className="flex flex-1 overflow-hidden">
                {/* Left side - Avatar Grid */}
                <AvatarGrid />

                {/* Right side - Chat Interface */}
                <div className="w-1/2 flex flex-col">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-4">
                            {/* Replace the drawer button with dropdown */}
                            <Dropdown>
                                <DropdownTrigger>
                                    <button 
                                        className="p-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <FiMenu size={24} />
                                    </button>
                                </DropdownTrigger>
                                <DropdownMenu>
                                    {chatHistory.map((chat) => (
                                        <DropdownItem 
                                            key={chat.id}
                                            onClick={() => selectChat(chat.id)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium truncate">
                                                    {chat.messages[0]?.content || 'New Chat'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(chat.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                            
                            {/* Connection Status */}
                            <Dropdown>
                                <DropdownTrigger>
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:bg-gray-50">
                                        <div className={`w-2 h-2 rounded-full ${isContractConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        <span className="text-sm">
                                            {isContractConnected ? 'Connected' : 'No contract connected'}
                                        </span>
                                    </button>
                                </DropdownTrigger>
                                {isContractConnected && (
                                    <DropdownMenu>
                                        <DropdownItem>
                                            <div className="flex flex-col gap-1 py-1">
                                                <span className="text-sm font-medium">Contract Address:</span>
                                                <span className="text-xs text-gray-500 break-all">
                                                    {connectedContract}
                                                </span>
                                            </div>
                                        </DropdownItem>
                                        <DropdownItem>
                                            <button 
                                                onClick={handleDisconnectContract}
                                                className="w-full text-left text-sm text-red-500 hover:text-red-600"
                                            >
                                                Disconnect Contract
                                            </button>
                                        </DropdownItem>
                                    </DropdownMenu>
                                )}
                            </Dropdown>
                        </div>

                        {/* Model Selection & OnChain Proof */}
                        <div className="flex items-center gap-4">
                            {/* Model Selection Dropdown */}
                            <Dropdown>
                                <DropdownTrigger>
                                    <button className="px-4 py-2 border rounded-md">
                                        {selectedModel === 'openai' ? 'OpenAI GPT-4o' : 'Llama 3.3 70B'}
                                    </button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Model Selection">
                                    <DropdownItem key="openai" onClick={() => setSelectedModel('openai')}>
                                        OpenAI GPT-4o
                                    </DropdownItem>
                                    <DropdownItem key="hyperbolic" onClick={() => setSelectedModel('hyperbolic')}>
                                        Llama 3.3 70B
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>

                            {/* OnChainProof is now rendered within the message component, not here */}
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`mb-4 transition-all duration-200 ease-in-out ${
                                    message.role === 'user' ? 'ml-auto' : 'mr-auto'
                                }`}
                            >
                                {message.role === 'user' ? (
                                    <div className="bg-blue-500 text-white rounded-lg p-3 max-w-[80%]">
                                        {message.content}
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 max-w-[80%]">
                                        <img 
                                            src={`/ai-avatars/${message.role}.png`}
                                            alt={message.role}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <div className="bg-gray-100 rounded-lg p-3">
                                            <div className="font-medium text-sm text-gray-600 mb-1">
                                                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                                            </div>
                                            <div>{message.content}</div>
                                        </div>
                                    </div>
                                )}
                                {message.proof && (
                                    <a 
                                        href={message.proof}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 text-sm ml-2"
                                    >
                                        (proof on chain)
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Chat Input - Keep existing code */}
                    <div className="p-4 border-t">
                        <div className="flex items-end gap-2">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message here..."
                                minRows={1}
                                maxRows={4}
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !input.trim()}
                                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-blue-300"
                            >
                                <FiSend size={20} />
                            </button>
                        </div>
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
