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
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleChatSelect = (chat) => {
        setSelectedChatId(chat.id);
    };

    const handleChatDelete = (chatId) => {
        if (selectedChatId === chatId) {
            setSelectedChatId(null);
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
                />
                <div className="flex-1">
                    <Chat 
                        selectedChatId={selectedChatId}
                        onChatSaved={handleChatSaved}
                    />
                </div>
            </div>
        </div>
    );
}
