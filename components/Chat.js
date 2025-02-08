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

            // Auto-save after first message exchange if it's a new chat
            if (!chatId && messages.length === 0) {
                await handleSaveToNillion();
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

    const handleSaveToNillion = async () => {
        if (!isConnected || messages.length === 0) return;
        
        setIsSaving(true);
        try {
            // Create a conversation object that contains all messages
            const conversation = {
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                title: messages[0].content.substring(0, 30) + '...' // Use first message as title
            };

            // Store the entire conversation as one record
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store',
                    walletAddress: address,
                    message: JSON.stringify(conversation), // Store entire conversation as JSON string
                    chatId: chatId || undefined // Include chatId if it exists
                }),
            });

            if (!response.ok) throw new Error('Failed to save conversation');
            const result = await response.json();
            
            // If this is a new chat, store the returned chatId
            if (!chatId && result.chatId) {
                setChatId(result.chatId);
            }
            
            alert('Conversation saved successfully!');
            
            // Call the refresh function after successful save
            if (onChatSaved) {
                onChatSaved();
            }
        } catch (error) {
            console.error('Failed to save to Nillion:', error);
            alert('Failed to save conversation: ' + error.message);
        } finally {
            setIsSaving(false);
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

                    {/* Save to Nillion button */}
                    {messages.length > 0 && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleSaveToNillion}
                                disabled={isSaving || !isConnected}
                                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 w-full"
                            >
                                {isSaving ? 'Saving...' : 'Save Conversation to Nillion'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat; 