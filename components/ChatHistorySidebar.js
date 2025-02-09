import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
import { CircularProgress } from "@heroui/progress";
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
        if (typeof text === 'object' && text.$allot) {
            return "Encrypted message...";
        }
        
        if (typeof text === 'string') {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

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
            
            const chatGroups = data.reduce((acc, msg) => {
                if (!acc[msg.chatId]) {
                    acc[msg.chatId] = [];
                }
                acc[msg.chatId].push(msg);
                return acc;
            }, {});

            const userChats = await Promise.all(
                Object.entries(chatGroups).map(async ([chatId, messages]) => {
                    try {
                        const sortedMessages = messages.sort((a, b) => 
                            new Date(b.timestamp) - new Date(a.timestamp)
                        );
                        const latestMessage = sortedMessages[0];
                        
                        if (!latestMessage) return null;

                        let messageData;
                        try {
                            messageData = JSON.parse(latestMessage.message);
                        } catch (e) {
                            console.error('Failed to parse message data:', e);
                            return null;
                        }

                        if (!messageData || !Array.isArray(messageData.messages)) {
                            console.error('Invalid message data structure');
                            return null;
                        }

                        const decryptedMessages = await Promise.all(
                            messageData.messages.map(async (chatMsg) => {
                                if (!chatMsg) return null;
                                
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

                        const validMessages = decryptedMessages.filter(Boolean);
                        const firstUserMessage = validMessages.find(m => m.role === 'user');
                        
                        return {
                            id: chatId,
                            messages: validMessages,
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
            
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            onChatDelete?.(chatId);
        } catch (error) {
            console.error('Failed to delete chat:', error);
            alert('Failed to delete chat: ' + error.message);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        
        return (
            <span className="whitespace-nowrap">
                {`${day}/${month}/${year} ${hours}:${minutes}${ampm}`}
                <span className="text-gray-400"> (GMT-8)</span>
            </span>
        );
    };

    const renderChatTitle = (chat) => {
        try {
            if (chat.walletAddress !== address) {
                return "Encrypted Chat";
            }
            if (!chat.title) return "New Chat";
            return chat.title;
        } catch (e) {
            console.error('Failed to parse chat title:', e);
            return "Chat";
        }
    };

    return (
        <div className="w-80 bg-white h-full flex flex-col">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Chat History</h2>
                    <button
                        onClick={() => onChatSelect({ id: null })}
                        disabled={!isConnected}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                    >
                        New Chat
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <CircularProgress size="sm" />
                    </div>
                ) : !chats || chats.length === 0 ? (
                    <div className="text-center p-4 text-gray-500">
                        No chats yet
                    </div>
                ) : (
                    <div className="divide-y">
                        {chats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => onChatSelect(chat)}
                                className={`p-3 hover:bg-gray-50 cursor-pointer group relative ${
                                    selectedChatId === chat.id ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div className="truncate font-medium">
                                    {renderChatTitle(chat)}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {formatDate(chat.timestamp)}
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, chat.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                                >
                                    <TrashIcon className="h-4 w-4 text-red-500" />
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