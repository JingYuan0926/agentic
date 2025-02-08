import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
import {CircularProgress} from "@heroui/progress";
import { useState, useEffect } from 'react';
import { NilQLWrapper } from 'nillion-sv-wrappers';

function ChatHistorySidebar({ onChatSelect, onChatDelete, refreshTrigger, selectedChatId }) {
    const { address, isConnected } = useWeb3ModalAccount();
    const [chats, setChats] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [nilQLWrapper, setNilQLWrapper] = useState(null);

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

    // Load chat list when wallet connects
    useEffect(() => {
        if (isConnected && address && nilQLWrapper) {
            loadChats();
        } else {
            setChats([]);
        }
    }, [isConnected, address, refreshTrigger, nilQLWrapper]);

    const truncateText = (text, maxLength = 20) => {
        // Handle case where text is an object with $allot
        if (typeof text === 'object' && text.$allot) {
            // For encrypted content, just show a generic title
            return "Encrypted message...";
        }
        
        // Handle normal string text
        if (typeof text === 'string') {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        // Fallback for any other case
        return "New message";
    };

    const loadChats = async () => {
        if (!address || !nilQLWrapper) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'readAll',
                    walletAddress: address
                }),
            });

            if (!response.ok) throw new Error('Failed to load chats');
            const data = await response.json();
            
            // Group messages by chatId first
            const chatGroups = data.reduce((acc, msg) => {
                if (!acc[msg.chatId]) {
                    acc[msg.chatId] = [];
                }
                acc[msg.chatId].push(msg);
                return acc;
            }, {});

            // Process each chat group
            const userChats = await Promise.all(
                Object.entries(chatGroups).map(async ([chatId, messages]) => {
                    try {
                        // Sort messages by timestamp and get the latest
                        const sortedMessages = messages.sort((a, b) => 
                            new Date(b.timestamp) - new Date(a.timestamp)
                        );
                        const latestMessage = sortedMessages[0];
                        
                        if (!latestMessage) return null;

                        const messageData = JSON.parse(latestMessage.message);
                        const decryptedMessages = await Promise.all(
                            messageData.messages.map(async (chatMsg) => {
                                if (chatMsg.content && typeof chatMsg.content === 'object' && chatMsg.content.$allot) {
                                    try {
                                        const decryptedContent = await nilQLWrapper.decrypt(chatMsg.content.$allot);
                                        return { ...chatMsg, content: decryptedContent };
                                    } catch (e) {
                                        console.error('Failed to decrypt message:', e);
                                        return { ...chatMsg, content: 'Encrypted message' };
                                    }
                                }
                                return chatMsg;
                            })
                        );

                        // Find first user message for title
                        const firstUserMessage = decryptedMessages.find(m => m.role === 'user');
                        
                        return {
                            id: chatId,
                            messages: decryptedMessages,
                            timestamp: latestMessage.timestamp,
                            walletAddress: latestMessage.walletAddress,
                            title: messageData.title || truncateText(firstUserMessage?.content) || 'New Chat'
                        };
                    } catch (e) {
                        console.error('Failed to process chat:', e);
                        return null;
                    }
                })
            );

            // Filter out any failed parses and sort by timestamp
            const sortedChats = userChats
                .filter(Boolean)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setChats(sortedChats);
        } catch (error) {
            console.error('Failed to load chats:', error);
            setChats([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e, chatId) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this chat?')) return;

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

            if (!response.ok) throw new Error('Failed to delete chat');
            
            // Just remove the chat from local state
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            // Notify parent component
            onChatDelete(chatId);
        } catch (error) {
            console.error('Failed to delete chat:', error);
            alert('Failed to delete chat: ' + error.message);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        // Add 8 hours for UTC+8
        date.setHours(date.getHours() + 8);
        
        // Format date as dd/mm/yyyy
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        // Format time as X:XXam (GMT+8) all in one line
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'am' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        // Return all in one line with smaller font for GMT+8
        return (
            <span className="whitespace-nowrap">
                {`${day}/${month}/${year} ${hours}:${minutes}${ampm}`}
                <span className="text-gray-400"> (GMT+8)</span>
            </span>
        );
    };

    const renderChatTitle = (chat) => {
        try {
            // Only show actual content if it's the owner's chat
            if (chat.walletAddress !== address) {
                return "Encrypted Chat";
            }

            // Safely parse the message
            if (!chat.title) return "New Chat";
            
            // If we have a title, use it
            return chat.title;
        } catch (e) {
            console.error('Failed to parse chat title:', e);
            return "Chat";
        }
    };

    return (
        <div className={`w-64 border-r dark:border-gray-700 ${!isConnected ? 'opacity-50' : ''} flex flex-col h-full`}>
            <div className="p-4 flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        Chat History
                    </h2>
                    <button
                        onClick={() => {
                            onChatSelect({ id: null });
                        }}
                        disabled={!isConnected}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50
                                 text-sm font-medium"
                    >
                        New Chat
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-[calc(100%-60px)]">
                        <CircularProgress 
                            aria-label="Loading chats..." 
                            color="primary"
                            className="w-10 h-10"
                        />
                    </div>
                ) : !chats || chats.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No chat history yet.
                        <br />
                        Start a new conversation!
                    </div>
                ) : (
                    <div className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {chats.map((chat) => (
                            <div
                                key={`chat-${chat.id}`}
                                className="group relative hover:bg-gray-100 dark:hover:bg-gray-700 
                                         transition-colors rounded cursor-pointer"
                            >
                                <div 
                                    onClick={() => onChatSelect({
                                        id: chat.id,
                                        messages: chat.messages,
                                        walletAddress: chat.walletAddress
                                    })}
                                    className="p-2 pr-10"
                                >
                                    <div className="font-medium text-black dark:text-white truncate">
                                        {renderChatTitle(chat)}
                                    </div>
                                    <div 
                                        className="text-sm text-gray-500"
                                        suppressHydrationWarning={true}
                                    >
                                        {formatDate(chat.timestamp)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(e, chat.id);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2
                                             text-red-500 hover:text-red-700 
                                             opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete chat"
                                    disabled={!isConnected}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatHistorySidebar;