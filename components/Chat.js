'use client'
import { useState, useRef, useEffect } from 'react';
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import dynamic from 'next/dynamic';

// Disable SSR for the Chat component
const Chat = dynamic(() => Promise.resolve(ChatComponent), {
    ssr: false
});

function ChatComponent({ selectedChatId, onChatSaved }) {
    const { address, isConnected } = useWeb3ModalAccount();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [chatId, setChatId] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Modified useEffect to handle new chat
    useEffect(() => {
        if (selectedChatId) {
            loadSavedChat(selectedChatId);
        } else {
            // Clear messages for new chat
            setMessages([]);
            setChatId(null);
        }
    }, [selectedChatId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !isConnected) return;

        setIsLoading(true);
        try {
            // Add user message to UI immediately
            const userMessage = { role: 'user', content: input };
            setMessages(prev => [...prev, userMessage]);
            setInput('');

            // Store user message and get chatId
            const storedChatId = await storeMessage(userMessage);
            const isNewChat = !chatId && storedChatId; // Check if this is a new chat

            // Get AI response
            const response = await fetch('/api/ai-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: input }),
            });

            if (!response.ok) throw new Error('Failed to get AI response');
            const data = await response.json();
            
            // Add AI response to UI
            const aiMessage = { role: 'assistant', content: data.response };
            setMessages(prev => [...prev, aiMessage]);

            // Store AI response with same chatId
            await storeMessage(aiMessage, storedChatId);

            // Only refresh sidebar for new chats (first user message)
            if (isNewChat && onChatSaved) {
                onChatSaved();
            }

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

    const storeMessage = async (message, forcedChatId = null) => {
        try {
            let currentChatId = forcedChatId || chatId;
            let existingData = null;

            // If we have a chatId, try to get existing record
            if (currentChatId) {
                const fetchResponse = await fetch('/api/nillion-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'read',
                        walletAddress: address,
                        chatId: currentChatId
                    }),
                });

                if (fetchResponse.ok) {
                    existingData = await fetchResponse.json();
                }
            }

            // If we found existing data, append to it
            let conversation;
            if (existingData && existingData.message) {
                const existingConversation = JSON.parse(existingData.message);
                conversation = {
                    ...existingConversation,
                    messages: [...existingConversation.messages, message]
                };
            } else {
                // Create new conversation
                conversation = {
                    messages: [message],
                    title: message.content.substring(0, 30) + '...'
                };
            }

            // Store the updated/new conversation
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(conversation),
                    chatId: currentChatId || undefined
                }),
            });

            if (!response.ok) throw new Error('Failed to store message');
            const result = await response.json();
            
            // Set chatId for new conversations
            if (!currentChatId && result.chatId) {
                currentChatId = result.chatId;
                setChatId(currentChatId);
            }

            return currentChatId;
        } catch (error) {
            console.error('Failed to store message:', error);
            throw error;
        }
    };

    const loadSavedChat = async (savedChatId) => {
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'read',
                    walletAddress: address,
                    chatId: savedChatId
                }),
            });

            if (!response.ok) throw new Error('Failed to load chat');
            const data = await response.json();
            
            if (data) {
                try {
                    // Parse the stored conversation JSON
                    const conversation = JSON.parse(data.message);
                    setMessages(conversation.messages);
                    setChatId(savedChatId);
                } catch (e) {
                    console.error('Failed to parse conversation:', e);
                    alert('Failed to load chat: Invalid format');
                }
            }
        } catch (error) {
            console.error('Failed to load chat:', error);
            alert('Failed to load chat: ' + error.message);
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
                    ) : messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="text-center p-8 rounded-lg">
                                <h2 className="text-xl font-semibold mb-4">Start a New Conversation</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Type a message below to begin chatting with AI
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
                    <form onSubmit={handleSubmit} className="flex gap-2">
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