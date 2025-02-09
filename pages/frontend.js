import React from 'react';
import AvatarGrid from '../components/AvatarGrid';
import ChatInterface from '../components/ChatInterface';

export default function Frontend() {
  return (
    <div className="flex h-screen bg-gray-100">
      <AvatarGrid />
      <ChatInterface />
    </div>
  );
}
