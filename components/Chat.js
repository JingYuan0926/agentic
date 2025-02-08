'use client'
import { useState, useRef, useEffect } from 'react';
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import dynamic from 'next/dynamic';
import { NilQLWrapper } from 'nillion-sv-wrappers';

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
    const [nilQLWrapper, setNilQLWrapper] = useState(null);

    // Load selected chat
    useEffect(() => {
        if (selectedChatId) {
            setMessages(selectedChatId.messages || []);
            setChatId(selectedChatId.id);
        } else {
            setMessages([]);
            setChatId(null);
            setInput('');
        }
    }, [selectedChatId]);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll on messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

            // Encrypt the message content
            const encryptedContent = message.content;
            if (nilQLWrapper) {
                const shares = await nilQLWrapper.encrypt(message.content);
                message = {
                    ...message,
                    content: { $allot: shares } // Store encrypted shares
                };
            }

            let conversation;
            if (existingData && existingData.message) {
                const existingConversation = JSON.parse(existingData.message);
                conversation = {
                    ...existingConversation,
                    messages: [...existingConversation.messages, message]
                };
            } else {
                conversation = {
                    messages: [message],
                    title: encryptedContent.substring(0, 30) + '...' // Keep title in plaintext
                };
            }

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

    const loadSavedChat = async (chatData) => {
        try {
            if (!nilQLWrapper) {
                console.error('Encryption wrapper not initialized');
                return;
            }

            if (!chatData || !chatData.message) {
                throw new Error('No chat data found');
            }

            try {
                const conversation = JSON.parse(chatData.message);
                
                // Check if this chat belongs to the current wallet
                if (chatData.walletAddress !== address) {
                    throw new Error('Unauthorized: Cannot decrypt messages from other wallets');
                }

                // Decrypt messages only if we're the owner
                const decryptedMessages = await Promise.all(
                    conversation.messages.map(async (msg) => {
                        if (msg && msg.content && typeof msg.content === 'object' && msg.content.$allot) {
                            try {
                                const decryptedContent = await nilQLWrapper.decrypt(msg.content.$allot);
                                return {
                                    ...msg,
                                    content: decryptedContent
                                };
                            } catch (e) {
                                console.error('Failed to decrypt message:', e);
                                return {
                                    ...msg,
                                    content: 'Encrypted message (cannot decrypt)',
                                    isEncrypted: true
                                };
                            }
                        }
                        return msg;
                    })
                );

                setMessages(decryptedMessages);
                setChatId(chatData.id);
            } catch (e) {
                console.error('Failed to load chat:', e);
                setMessages([{
                    role: 'system',
                    content: 'Cannot access this chat: ' + e.message,
                    isError: true
                }]);
            }
        } catch (error) {
            console.error('Failed to load chat:', error);
            setMessages([{
                role: 'system',
                content: 'Failed to load chat: ' + error.message,
                isError: true
            }]);
        }
    };

    return (
        <div className="flex justify-center" key={selectedChatId || 'new'}>
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