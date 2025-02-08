import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
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
            
            // Group messages by chatId and get first user message as title
            const chatGroups = data.reduce((acc, msg) => {
                const chatId = msg.chatId;
                if (!acc[chatId]) {
                    try {
                        const conversation = JSON.parse(msg.message);
                        // Find first user message
                        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                        acc[chatId] = {
                            id: chatId,
                            title: firstUserMessage ? firstUserMessage.content : 'New Chat',
                            timestamp: msg.timestamp,
                            messageId: msg._id,
                            fullMessage: msg.message // Store full conversation for loading later
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
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className={`w-64 border-r dark:border-gray-700 overflow-y-auto ${!isConnected ? 'opacity-50' : ''}`}>
            <div className="p-4">
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
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : !chats || chats.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No chat history yet.
                        <br />
                        Start a new conversation!
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chats.map((chat) => (
                            <div
                                key={`chat-${chat.id}`}
                                className="flex items-center group"
                            >
                                <button
                                    onClick={() => onChatSelect(chat)}
                                    disabled={!isConnected}
                                    className="flex-1 text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:cursor-not-allowed"
                                >
                                    <div className="font-medium truncate text-black dark:text-white">
                                        {chat.title}
                                    </div>
                                    <div 
                                        className="text-sm text-gray-500"
                                        suppressHydrationWarning={true}
                                    >
                                        {formatDate(chat.timestamp)}
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, chat.id, chat.messageId)}
                                    className="p-2 text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
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