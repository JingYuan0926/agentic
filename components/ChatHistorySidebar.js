import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
import {CircularProgress} from "@heroui/progress";
import { useState, useEffect } from 'react';

function ChatHistorySidebar({ onChatSelect, onChatDelete, refreshTrigger }) {
    const { address, isConnected } = useWeb3ModalAccount();
    const [chats, setChats] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load chat list when wallet connects
    useEffect(() => {
        if (isConnected && address) {
            loadChats();
        } else {
            setChats([]);
        }
    }, [isConnected, address, refreshTrigger]);

    const truncateText = (text, maxLength = 20) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const loadChats = async () => {
        if (!address) return;
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
            
            const chatGroups = data.reduce((acc, msg) => {
                const chatId = msg.chatId;
                if (!acc[chatId]) {
                    try {
                        const conversation = JSON.parse(msg.message);
                        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                        acc[chatId] = {
                            id: chatId,
                            title: firstUserMessage ? truncateText(firstUserMessage.content) : 'New Chat',
                            timestamp: msg.timestamp,
                            messageId: msg._id,
                            fullMessage: msg.message
                        };
                    } catch (e) {
                        console.error('Failed to parse message:', e);
                    }
                }
                return acc;
            }, {});

            setChats(Object.values(chatGroups));
        } catch (error) {
            console.error('Failed to load chats:', error);
            setChats([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e, chatId, messageId) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const response = await fetch('/api/nillion-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    walletAddress: address,
                    messageId: messageId || chatId // Use messageId if available, fallback to chatId
                }),
            });

            if (!response.ok) throw new Error('Failed to delete chat');
            
            setChats(prev => prev.filter(c => c.id !== chatId));
            onChatDelete(chatId);
        } catch (error) {
            console.error('Failed to delete chat:', error);
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

    return (
        <div className={`w-64 border-r dark:border-gray-700 ${!isConnected ? 'opacity-50' : ''} flex flex-col h-full`}>
            <div className="p-4 flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        Chat History
                    </h2>
                    <button
                        onClick={() => onChatSelect({ id: null, isNew: true })}
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
                                    onClick={() => onChatSelect(chat)}
                                    className="p-2 pr-10" // Added right padding for delete button
                                >
                                    <div className="font-medium text-black dark:text-white truncate">
                                        {chat.title}
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
                                        handleDelete(e, chat.id, chat.messageId);
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