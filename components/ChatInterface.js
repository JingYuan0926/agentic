import React from 'react';

export default function ChatInterface() {
  return (
    <div className="w-1/2 flex flex-col p-4">
      {/* Top Navigation */}
      <div className="flex justify-between mb-4">
        <div className="w-32 h-12 bg-gray-500 flex items-center justify-center text-white">
          Logo.png
        </div>
        <div className="w-32 h-12 bg-gray-500 flex items-center justify-center text-white">
          Connect Wallet
        </div>
      </div>

      {/* Model Selection Bar */}
      <div className="flex items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 flex flex-col space-y-1">
            <div className="h-1 w-8 bg-gray-700"></div>
            <div className="h-1 w-8 bg-gray-700"></div>
            <div className="h-1 w-8 bg-gray-700"></div>
          </div>
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
        </div>
        <div className="ml-2 w-48 h-10 border border-gray-300 rounded flex items-center justify-center">
          Model Selection
        </div>
      </div>

      {/* Chat Area - Flex grow to take remaining space */}
      <div className="flex-grow"></div>

      {/* Chat Input Box */}
      <div className="h-16 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
        Chat input box
      </div>
    </div>
  );
} 