import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function AITest() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contractABI, setContractABI] = useState(null);
    const [contractAddress, setContractAddress] = useState('');
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);
    const [walletAddress, setWalletAddress] = useState('');
    const [walletBalance, setWalletBalance] = useState('');
    const [veeStorage, setVeeStorage] = useState([]);
    const [dexStorage, setDexStorage] = useState([]);

    // Clear localStorage and reset state on mount
    useEffect(() => {
        loadAIHistory();
    }, []);

    const loadAIHistory = () => {
        if (typeof window !== 'undefined') {
            const veeData = localStorage.getItem('veeHistory');
            const dexData = localStorage.getItem('dexHistory');
            const contractData = localStorage.getItem('contractDetails');

            if (veeData) setVeeStorage(JSON.parse(veeData));
            if (dexData) setDexStorage(JSON.parse(dexData));
            if (contractData) {
                const { address, abi } = JSON.parse(contractData);
                setContractAddress(address);
                setContractABI(abi);
            }
        }
    };

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

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            // Check for contract connection command
            if (userMessage.toLowerCase().startsWith('/connect')) {
                const address = userMessage.split(' ')[1];
                if (!ethers.isAddress(address)) {
                    throw new Error('Invalid contract address');
                }
                setContractAddress(address);
                
                // Fetch ABI and store in localStorage
                const response = await fetch(`https://evm-testnet.flowscan.io/api/v2/smart-contracts/${address}`);
                if (response.ok) {
                    const data = await response.json();
                    setContractABI(data.abi);
                    localStorage.setItem('contractDetails', JSON.stringify({
                        address,
                        abi: data.abi,
                        timestamp: Date.now()
                    }));
                    setMessages(prev => [...prev, { role: 'system', content: 'Contract connected successfully!' }]);
                }
                setIsLoading(false);
                return;
            }

            // First, let Vee identify the function
            const veeResponse = await fetch('/api/vee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    contractAddress,
                    userQuery: userMessage,
                    context: { lastInteraction: localStorage.getItem('lastInteraction') }
                })
            });

            const veeData = await veeResponse.json();
            if (!veeData.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: veeData.message }]);
                setIsLoading(false);
                return;
            }

            // Then, let Dex extract parameters
            const dexResponse = await fetch('/api/dex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    functionInfo: veeData.function,
                    userQuery: userMessage,
                    contractAddress,
                    context: { lastInteraction: localStorage.getItem('lastInteraction') }
                })
            });

            const dexData = await dexResponse.json();
            
            // Update AI storage displays
            loadAIHistory();

            if (!dexData.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: dexData.message }]);
            } else {
                // Execute the transaction if we have all parameters
                const contract = new ethers.Contract(contractAddress, contractABI, signer);
                const tx = await contract[veeData.function.name](...dexData.params);
                await tx.wait();
                
                setMessages(prev => [...prev, 
                    { role: 'assistant', content: 'Transaction executed successfully!' },
                    { role: 'system', content: `Transaction hash: ${tx.hash}` }
                ]);
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
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
                    className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
                >
                    {walletAddress 
                        ? `Connected: ${walletBalance} FLOW` 
                        : 'Connect Wallet'}
                </button>
            </div>

            {/* Chat Interface */}
            <div className="mb-4 h-[400px] overflow-y-auto border rounded p-4 bg-gray-50">
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
                    <div className="text-gray-500 italic">Processing...</div>
                )}
            </div>

            {/* AI Memory Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-purple-50 rounded">
                    <h3 className="font-semibold mb-2">Vee's Memory:</h3>
                    <div className="max-h-40 overflow-y-auto">
                        {veeStorage.map((item, index) => (
                            <div key={index} className="text-sm mb-2 p-2 bg-white rounded">
                                <div>Query: {item.userQuery}</div>
                                <div>Function: {item.analysis?.identifiedFunction?.name}</div>
                                <div>Confidence: {item.analysis?.identifiedFunction?.confidence}</div>
                                <div>Success: {item.success ? '✅' : '❌'}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-blue-50 rounded">
                    <h3 className="font-semibold mb-2">Dex's Memory:</h3>
                    <div className="max-h-40 overflow-y-auto">
                        {dexStorage.map((item, index) => (
                            <div key={index} className="text-sm mb-2 p-2 bg-white rounded">
                                <div>Function: {item.functionName}</div>
                                <div>Query: {item.userQuery}</div>
                                <div>Success: {item.success ? '✅' : '❌'}</div>
                                <div className="text-xs">
                                    Params: {JSON.stringify(item.extraction?.extractedParams)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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

            {/* Instructions */}
            <div className="mt-8 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Connect your wallet using the green button above</li>
                    <li>Connect to a contract using /connect {'<address>'}</li>
                    <li>Type your command in natural language (e.g., "increment the counter by 5")</li>
                    <li>Vee will identify the function and Dex will extract parameters</li>
                    <li>Confirm the transaction in your wallet when prompted</li>
                </ol>
            </div>
        </div>
    );
} 