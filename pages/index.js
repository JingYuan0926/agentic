'use client'
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';

// Dynamically import components with SSR disabled
const Chat = dynamic(() => import('../components/Chat'), {
    ssr: false
});

const ChatHistorySidebar = dynamic(() => import('../components/ChatHistorySidebar'), {
    ssr: false
});

export default function Home() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
    };

    const handleChatDelete = (chatId) => {
        if (selectedChat?.id === chatId) {
            setSelectedChat(null);
        }
    };

    const handleChatSaved = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <ChatHistorySidebar 
                    refreshTrigger={refreshTrigger}
                    onChatSelect={handleChatSelect}
                    onChatDelete={handleChatDelete}
                    selectedChatId={selectedChat?.id}
                />
                <div className="flex-1">
                    <Chat 
                        selectedChatId={selectedChat}
                        onChatSaved={handleChatSaved}
                    />
                </div>
            </div>
        </div>
    );
}
