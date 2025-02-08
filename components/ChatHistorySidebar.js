import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
import nillionService from '../services/nillionService.js';
import { useState, useEffect } from 'react';

function ChatHistorySidebar({ onChatSelect, onChatDelete }) {
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
    }, [isConnected, address]);

    const loadChats = async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const chatList = await nillionService.getChatList(address);
            setChats(chatList || []); // Ensure chats is always an array
        } catch (error) {
            console.error('Failed to load chats:', error);
            setChats([]); // Set empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e, chat) => {
        e.stopPropagation();
        try {
            await nillionService.deleteChat(address, chat.id);
            setChats(prev => prev.filter(c => c.id !== chat.id));
            onChatDelete(chat.id);
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
                <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">
                    Chat History
                </h2>
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
                                key={chat.id}
                                className="flex items-center group"
                            >
                                <button
                                    onClick={() => !isConnected && onChatSelect(chat)}
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
                                    onClick={(e) => handleDelete(e, chat)}
                                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
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