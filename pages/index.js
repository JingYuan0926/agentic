'use client'
import { useState, useEffect } from 'react';
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import Chat from '../components/Chat';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import Header from '../components/Header';
import nillionService from '../services/nillionService.js';

export default function Home() {
  const { address } = useWeb3ModalAccount();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat list when wallet connects
  useEffect(() => {
    if (address) {
      loadChats();
    } else {
      setChats([]);
      setSelectedChatId(null);
    }
  }, [address]);

  const loadChats = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const chatList = await nillionService.getChatList(address);
      setChats(chatList);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChatId(chat.id);
  };

  const handleNewChat = (newChat) => {
    setChats(prev => [...prev, {
      id: newChat.chatId,
      title: newChat.title,
      timestamp: new Date().toISOString()
    }]);
    setSelectedChatId(newChat.chatId);
  };

  const handleChatDelete = (chatId) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ChatHistorySidebar 
          chats={chats}
          isLoading={isLoading}
          onChatSelect={handleChatSelect}
          onChatDelete={handleChatDelete}
        />
        <div className="flex-1">
          <Chat 
            selectedChatId={selectedChatId}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
    </div>
  );
}
