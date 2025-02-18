'use client'
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import dynamic from 'next/dynamic';
import { BrowserProvider, Contract } from 'ethers';
import OnChainProof from '../components/OnChainProof';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Textarea } from "@heroui/input";
import { FiMenu, FiSend } from 'react-icons/fi';
import Header from '../components/Header';
import AvatarGrid from '../components/AvatarGrid';
import { Link } from "@heroui/link";
import { NilQLWrapper } from 'nillion-sv-wrappers';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import TransactionModal from '../components/TransactionModal';

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

    // Add this near the top with other state declarations
    const [selectedModel, setSelectedModel] = useState('openai'); // 'openai' or 'hyperbolic'

    // Add this near the top of ChatComponent
    const FLOW_CHAIN_ID = '0x221';

    // Add this with other state declarations at the top
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);

    // Add state for chat history drawer
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Add new state for active agent
    const [activeAgent, setActiveAgent] = useState(null);
    // Add this mapping near the top of the ChatComponent function
    const agentAvatars = {
        finn: '/ai-avatars/finn.png',
        vee: '/ai-avatars/vee.png',
        dex: '/ai-avatars/dex.png',
        codey: '/ai-avatars/codey.png',
        system: '/ai-avatars/system.png'
    };

    // Add new state for proof loading at component level
    const [proofLoadingStates, setProofLoadingStates] = useState({});

    // Add this line to fix the error
    const [txPopup, setTxPopup] = useState(null);

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

    // Modify loadChatHistory to remove Nillion functionality
    const loadChatHistory = async () => {
        if (!isConnected || !address) return;
        
        try {
            // For now, just set empty chat history
            setChatHistory([]);
            
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

    // Modify addMessage to remove encryption
    const addMessage = async (role, content, agent = null) => {
        if (!isConnected || !address) return;
        
        try {
            const timestamp = Date.now();
            const newMessage = { role, content, agent, timestamp };
            
            // Update local state immediately
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

            // Update active agent when AI responds
            if (agent) {
                const agentMap = {
                    'Finn': 'finder',
                    'Codey': 'creator',
                    'Dex': 'developer',
                    'Vee': 'verifier'
                };
                setActiveAgent(agentMap[agent]);
                
                await new Promise(resolve => setTimeout(resolve, 100));
                setActiveAgent(null);
            }

            return timestamp.toString();
        } catch (error) {
            console.error('Message error:', error);
            setMessages(prev => [...prev, { role, content, agent, timestamp: Date.now() }]);
            setActiveAgent(null);
            throw error;
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
                        addMessage('assistant', `Contract deployed!`, 'Codey');

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
                            addMessage('assistant', 
                                <Link 
                                    href={verifyData.explorerUrl}
                                    isExternal
                                    showAnchorIcon
                                    color="primary"
                                    className="hover:opacity-70"
                                >
                                    View on Explorer
                                </Link>, 
                                'Codey'
                            );
                            addMessage('system', 'Do you want to generate a proof of execution on chain?', 'Codey');
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

    // Add refresh trigger for chat history
    useEffect(() => {
        if (isClient && isConnected && address) {
            loadChatHistory();
        }
    }, [isClient, isConnected, address]);

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

    // Modify the proof generation section to use a separate function instead:
    const handleGenerateProof = async (messageTimestamp) => {
        if (!signer) {
            console.error('No signer available');
            return;
        }
        
        setProofLoadingStates(prev => ({ ...prev, [messageTimestamp]: true }));
        try {
            // Create provider and contract instances
            const provider = new ethers.JsonRpcProvider('https://ethereum-holesky.publicnode.com');
            const contract = new ethers.Contract(contractAddress, abi, provider);

            // Initialize AI wallet for signing
            if (!process.env.NEXT_PUBLIC_AI_PRIVATE_KEY) {
                throw new Error('AI private key not configured');
            }
            const aiWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_AI_PRIVATE_KEY, provider);

            // Convert messages array to string
            const chatContent = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            // Create hash of content
            const hashBeforeSign = ethers.keccak256(ethers.toUtf8Bytes(chatContent));
            console.log('Hash before sign:', hashBeforeSign);

            // Get AI signature
            const messageBytes = ethers.getBytes(hashBeforeSign);
            const signature = await aiWallet.signMessage(messageBytes);
            console.log('AI Signature:', signature);

            // Create contract instance with signer
            const contractWithSigner = contract.connect(signer);

            // Submit task with encoded data
            const tx = await contractWithSigner.createNewTask(
                hashBeforeSign,
                signature,
                {
                    gasLimit: 500000
                }
            );

            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction receipt:', receipt);

            handleTransactionComplete({
                createTaskHash: tx.hash,
                responseHash: tx.hash
            });
        } catch (error) {
            console.error('Proof generation error:', error);
            setError(error.message);
        } finally {
            setProofLoadingStates(prev => ({ ...prev, [messageTimestamp]: false }));
        }
    };

    // Modify the useEffect for handling initial message
    useEffect(() => {
        const handleInitialMessage = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const initialMessage = urlParams.get('message');
            
            if (initialMessage && isConnected) {
                setInput(initialMessage);
                // Clean up URL without refreshing page
                window.history.replaceState({}, '', '/chat');
            }
        };

        if (isConnected) {
            handleInitialMessage();
        }
    }, [isConnected]); // Simplified dependencies

    // Initialize nilQL wrapper
    const [nilQLWrapper, setNilQLWrapper] = useState(null);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !isConnected || !nilQLWrapper) return;

        setIsLoading(true);
        try {
            // Add user message
            const userMessage = { role: 'user', content: input };
            const encryptedUserContent = await nilQLWrapper.encrypt(input);
            
            // Store user message
            const messageData = {
                messages: [{
                    ...userMessage,
                    content: { $allot: encryptedUserContent }
                }],
                title: input.substring(0, 30) + '...'
            };

            const storeResponse = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(messageData),
                    chatId: currentChatId || undefined
                }),
            });

            if (!storeResponse.ok) throw new Error('Failed to store message');
            const result = await storeResponse.json();
            
            if (!currentChatId) {
                setCurrentChatId(result.chatId);
            }

            setMessages(prev => [...prev, userMessage]);
            setInput('');

            // Get AI response
            const aiResponse = await fetch('/api/ai-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: input }),
            });

            if (!aiResponse.ok) throw new Error('Failed to get AI response');
            const aiData = await aiResponse.json();

            // Encrypt and store AI response
            const encryptedAiContent = await nilQLWrapper.encrypt(aiData.response);
            const aiMessage = { role: 'assistant', content: aiData.response };
            
            messageData.messages.push({
                ...aiMessage,
                content: { $allot: encryptedAiContent }
            });

            // Store updated conversation
            await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(messageData),
                    chatId: result.chatId || currentChatId
                }),
            });

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Error: ${error.message}`,
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChatSelect = async (selectedChat) => {
        if (!selectedChat || !selectedChat.messages) {
            setMessages([]);
            setCurrentChatId(null);
            return;
        }

        setCurrentChatId(selectedChat.id);
        setMessages(selectedChat.messages);
        setIsSidebarOpen(false);
    };

    // Add new state for chat history drawer
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen">
            {/* Header spans full width */}
            <Header />
            
            <div className="flex flex-1 overflow-hidden">
                {/* Left side - Avatar Grid */}
                <AvatarGrid activeAgent={activeAgent} />

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
                                        disabled={!isConnected}
                                    >
                                        <FiMenu size={24} className={!isConnected ? 'text-gray-400' : ''} />
                                    </button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Model Selection">
                                    {!isConnected ? (
                                        <DropdownItem>
                                            <div className="text-gray-500">
                                                Connect wallet to view chat history
                                            </div>
                                        </DropdownItem>
                                    ) : chatHistory.length === 0 ? (
                                        <DropdownItem>
                                            <div className="text-gray-500">
                                                No chat history found
                                            </div>
                                        </DropdownItem>
                                    ) : (
                                        chatHistory.map((chat) => (
                                            <DropdownItem 
                                                key={chat.id}
                                                className="flex justify-between items-center group"
                                            >
                                                <div 
                                                    className="flex-1 cursor-pointer"
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
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteChat(chat.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 p-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18"></path>
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </DropdownItem>
                                        ))
                                    )}
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
                                    <button className="px-4 py-2 border border-gray-500 rounded-md">
                                        {selectedModel === 'openai' ? 'OpenAI GPT-4o' : 'Hyperbolic'}
                                    </button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Model Selection">
                                    <DropdownItem key="openai" onClick={() => setSelectedModel('openai')}>
                                        OpenAI GPT-4o
                                    </DropdownItem>
                                    <DropdownItem key="hyperbolic" onClick={() => setSelectedModel('hyperbolic')}>
                                    Hyperbolic
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>

                            {/* OnChainProof is now rendered within the message component, not here */}
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${
                                    message.role === 'user' ? 'justify-end mb-4' : 'mb-4'
                                }`}
                            >
                                <div className={`${
                                    message.role === 'user' ? 'ml-auto' : 'mr-auto'
                                } max-w-[80%]`}>
                                    {message.role === 'user' ? (
                                        <div className="bg-blue-500 text-white rounded-lg p-3">
                                            <div className="break-words">
                                                {message.content}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 text-center">
                                                <img 
                                                    src={agentAvatars[message.agent?.toLowerCase()] || agentAvatars.finn}
                                                    alt={message.agent || 'Finn'}
                                                    className="w-8 h-8 rounded-full border border-gray-700"
                                                />
                                                <div className="text-sm font-medium text-gray-600 mt-1">
                                                    {message.agent || 'Finn'}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="bg-gray-100 rounded-lg p-3">
                                                    <div className="break-words">
                                                        {typeof message.content === 'string' ? 
                                                            message.content.replace(/\.\.\./g, '…')
                                                            .split(/(?<=[.!?])\s+/)
                                                            .filter(Boolean)
                                                            .join(' ')
                                                            : message.content
                                                        }
                                                    </div>
                                                </div>
                                                {message.content === 'Do you want to generate a proof of execution on chain?' && (
                                                    <div className="mt-2">
                                                        <OnChainProof 
                                                            messages={messages.filter(m => m.content !== 'Do you want to generate a proof of execution on chain?')} 
                                                            signer={signer}
                                                            onTransactionComplete={handleTransactionComplete}
                                                            onGeneratingChange={setIsGeneratingProof}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Chat Input Section */}
                    <div className="p-4 border-t">
                        <div className="flex items-end gap-2">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={
                                    !isConnected 
                                        ? "Connect Wallet to Start Using Us"
                                        : isLoading
                                            ? "AI is responding..."
                                            : isGeneratingProof
                                                ? "Generating proof..."
                                                : "Type your message here..."
                                }
                                minRows={1}
                                maxRows={4}
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                disabled={!isConnected || isLoading || isGeneratingProof}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !input.trim() || !isConnected || isGeneratingProof}
                                className={`p-3 rounded-full relative ${
                                    !isConnected || !input.trim() || isGeneratingProof
                                        ? 'bg-gray-200 cursor-not-allowed'
                                        : isLoading
                                            ? 'bg-blue-400 cursor-wait'
                                            : 'bg-blue-500 hover:bg-blue-600'
                                } text-white`}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiSend size={20} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Popup */}
            <TransactionModal 
                txData={txPopup} 
                onClose={() => setTxPopup(null)} 
            />

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sliding Sidebar */}
            <div className={`fixed left-0 top-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 transform ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <ChatHistorySidebar
                    onChatSelect={handleChatSelect}
                    selectedChatId={currentChatId}
                />
            </div>
        </div>
    );
}

export default Chat;
