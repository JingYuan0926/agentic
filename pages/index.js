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
    const [resetKey, setResetKey] = useState(0);

    const handleChatSelect = (chat) => {
        if (!chat?.id) {
            // Force remount of Chat component when starting new chat
            setResetKey(prev => prev + 1);
        }
        setSelectedChatId(chat?.id || null);
    };

    const handleChatDelete = (chatId) => {
        // If the deleted chat was selected, clear the selection
        if (selectedChatId === chatId) {
            setSelectedChatId(null);
            setResetKey(prev => prev + 1); // Reset chat component
        }
        // No need to refresh the sidebar as it's handled locally
    };

    const handleChatSaved = () => {
        // Only refresh sidebar when new chat is saved
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
                    selectedChatId={selectedChatId}
                />
                <div className="flex-1">
                    <Chat 
                        selectedChatId={selectedChatId}
                        onChatSaved={handleChatSaved}
                        key={`chat-${resetKey}-${selectedChatId || 'new'}`}
                    />
                </div>
            </div>
        </div>
    );
}
