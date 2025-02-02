'use client'
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';

// Dynamically import Header
const Header = dynamic(() => import('../components/Header'), {
    ssr: false
});

export default function Create() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { isConnected } = useWeb3ModalAccount();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            const response = await fetch('/api/gpt4', {
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
            
            // Add AI response
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
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
                            <div 
                                key={index} 
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                                        message.role === 'user' 
                                            ? 'bg-blue-500 text-white'
                                            : message.role === 'system'
                                            ? 'bg-gray-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 dark:text-white'
                                    }`}
                                >
                                    {message.content}
                                </div>
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
                                placeholder={isConnected ? "Test GPT-4 here..." : "Please connect wallet first"}
                                disabled={!isConnected || isLoading}
                                className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || isLoading}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Thinking...' : 'Send'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
} 