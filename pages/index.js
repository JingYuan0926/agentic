'use client'
import dynamic from 'next/dynamic';
import Chat from '../components/Chat';
import ChatHistorySidebar from '../components/ChatHistorySidebar';

// Dynamically import Header with ssr disabled
const Header = dynamic(() => import('../components/Header'), {
    ssr: false
});

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <div className="flex">
                <ChatHistorySidebar 
                    isLoading={false}
                    chats={[
                      
                    ]}
                    onChatSelect={(chat) => console.log('Selected chat:', chat)}
                />
                <div className="flex-1">
                    <Chat />
                </div>
            </div>
        </div>
    );
}
