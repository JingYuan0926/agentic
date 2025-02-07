import { useWeb3ModalAccount } from "@web3modal/ethers/react";

function ChatHistorySidebar({ onChatSelect, isLoading = false, chats = [] }) {
    const { address } = useWeb3ModalAccount();

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="w-64 border-r bg-white">
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
                            <button
                                key={chat.id}
                                onClick={() => onChatSelect(chat)}
                                className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
                            >
                                <div className="font-medium truncate text-black">
                                    {chat.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {formatDate(chat.timestamp)}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatHistorySidebar; 