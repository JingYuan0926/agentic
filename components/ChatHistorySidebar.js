import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { TrashIcon } from '@heroicons/react/24/outline';
import nillionService from '../services/nillionService.js';

function ChatHistorySidebar({ onChatSelect, onChatDelete, isLoading = false, chats = [], disabled }) {
    const { address } = useWeb3ModalAccount();

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString();
    };

    const handleDelete = async (e, chat) => {
        e.stopPropagation(); // Prevent chat selection when clicking delete
        try {
            await nillionService.deleteChat(address, chat.id);
            onChatDelete(chat.id);
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    return (
        <div className={`w-64 border-r dark:border-gray-700 overflow-y-auto ${disabled ? 'opacity-50' : ''}`}>
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                    Chat History
                </h2>
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : chats.length === 0 ? (
                    <div className="text-center text-gray-500">
                        No chat history
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chats.map((chat) => (
                            <div
                                key={chat.id}
                                className="flex items-center group"
                            >
                                <button
                                    onClick={() => !disabled && onChatSelect(chat)}
                                    disabled={disabled}
                                    className="flex-1 text-left p-2 rounded hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
                                >
                                    <div className="font-medium truncate text-black">
                                        {chat.title}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {formatDate(chat.timestamp)}
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, chat)}
                                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                                    title="Delete chat"
                                    disabled={disabled}
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