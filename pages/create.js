'use client'
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { ethers } from 'ethers';
import { Button, CheckIcon, CloseIcon } from "@heroui/react";

// Dynamically import Header
const Header = dynamic(() => import('../components/Header'), {
    ssr: false
});

export default function Create() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const messagesEndRef = useRef(null);
    const { isConnected } = useWeb3ModalAccount();
    const { walletProvider } = useWeb3ModalProvider();
    const [currentContract, setCurrentContract] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatResponse = (response) => {
        // Split the response into code and explanation
        const parts = response.split('EXPLANATION:');
        if (parts.length !== 2) return response;

        const [codeSection, explanation] = parts;
        const code = codeSection.replace('SOLIDITY_CODE:', '').trim();
        
        // Store the current contract code for deployment
        setCurrentContract(code);

        return `SMART CONTRACT:
${code}

HOW TO USE THIS CONTRACT:
${explanation.trim()}`;
    };

    const deployContract = async () => {
        if (!currentContract || !walletProvider) return;

        setIsDeploying(true);
        try {
            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();

            // Create contract factory
            const factory = new ethers.ContractFactory(
                ['abi will be generated from solidity code'],
                currentContract,
                signer
            );

            // Deploy contract
            const contract = await factory.deploy();
            await contract.waitForDeployment();

            // Add deployment success message
            const address = await contract.getAddress();
            const txHash = contract.deploymentTransaction().hash;
            
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Contract deployed successfully! 
Address: ${address}
Transaction Hash: ${txHash}`,
                isSuccess: true
            }]);

        } catch (error) {
            console.error('Deployment Error:', error);
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Deployment failed: ${error.message}`,
                isError: true
            }]);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !isConnected) return;

        setIsLoading(true);
        try {
            // Add user message
            setMessages(prev => [...prev, {
                role: 'user',
                content: input
            }]);

            // Get GPT-4 response
            const response = await fetch('/api/gpt4o', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: input })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            
            // Format and add AI response
            const formattedResponse = formatResponse(data.response);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: formattedResponse
            }]);

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Error: ${error.message}`,
                isError: true
            }]);
        } finally {
            setInput('');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header />
            <div className="flex justify-center">
                <div className="flex flex-col h-[calc(100vh-73px)] w-full max-w-3xl">
                    {/* Chat messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div key={index}>
                                <div 
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                                            message.role === 'user' 
                                                ? 'bg-blue-500 text-white'
                                                : message.role === 'system'
                                                ? message.isError 
                                                    ? 'bg-red-500 text-white'
                                                    : message.isSuccess
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 dark:text-white'
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                                {/* Deploy buttons for AI responses */}
                                {message.role === 'assistant' && index === messages.length - 1 && (
                                    <div className="flex justify-center gap-4 mt-4">
                                        <Button
                                            color="success"
                                            variant="shadow"
                                            startContent={<CheckIcon className="h-5 w-5" />}
                                            onClick={deployContract}
                                            isDisabled={isDeploying}
                                            isLoading={isDeploying}
                                        >
                                            Deploy Contract
                                        </Button>
                                        <Button
                                            color="danger"
                                            variant="shadow"
                                            startContent={<CloseIcon className="h-5 w-5" />}
                                            onClick={() => setCurrentContract(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t dark:border-gray-700 p-4">
                        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe the smart contract you want..."
                                disabled={isLoading || isDeploying}
                                className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <Button
                                type="submit"
                                color="primary"
                                variant="shadow"
                                isDisabled={isLoading || isDeploying}
                                isLoading={isLoading}
                            >
                                {isLoading ? 'Generating...' : 'Generate'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
} 