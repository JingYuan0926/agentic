'use client'
import { useState, useRef, useEffect } from 'react';
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import dynamic from 'next/dynamic';
import nillionService from '../services/nillionService.js';

// Disable SSR for the Chat component
const Chat = dynamic(() => Promise.resolve(ChatComponent), {
    ssr: false
});

function ChatComponent({ selectedChatId, onNewChat }) {
    const { address, isConnected } = useWeb3ModalAccount();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (address && selectedChatId) {
            loadMessages();
        }
    }, [address, selectedChatId]);

    const loadMessages = async () => {
        try {
            const messages = await nillionService.getChatMessages(address, selectedChatId);
            setMessages(messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !address || !isConnected) return;

        setIsLoading(true);
        try {
            let currentChatId = selectedChatId;

            // Create new chat if needed
            if (!currentChatId) {
                const newChat = await nillionService.createNewChat(address, input);
                currentChatId = newChat.chatId;
                onNewChat(newChat);
            }

            // Store user message
            await nillionService.storeMessage(address, currentChatId, 'user', input);

            // Get AI response
            const response = await fetch('/api/ai-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: input }),
            });

            if (!response.ok) throw new Error('Failed to get response');
            const data = await response.json();
            
            // Store AI response
            await nillionService.storeMessage(address, currentChatId, 'assistant', data.response);

            // Refresh messages
            await loadMessages();

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
        <div className="flex justify-center">
            <div className="flex flex-col h-[calc(100vh-73px)] w-full max-w-3xl">
                {/* Chat messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {!isConnected ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="text-center p-8 rounded-lg">
                                <h2 className="text-xl font-semibold mb-4">Connect Wallet to Chat</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Please connect your wallet to start chatting with AI
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

                {/* Input area */}
                <div className="border-t dark:border-gray-700 p-4">
                    <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isConnected ? "Type your message..." : "Connect wallet to chat"}
                            disabled={isLoading || !isConnected}
                            className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !isConnected}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Chat; 