import { useState, useEffect } from 'react';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import Header from '../components/Header';

export default function NillionTest() {
  const { address, isConnected } = useWeb3ModalAccount();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [allMessages, setAllMessages] = useState([]);

  // Load all messages when the page loads
  useEffect(() => {
    loadAllMessages();
  }, []);

  // Load connected wallet's messages when wallet connects or changes
  useEffect(() => {
    if (isConnected && address) {
      handleSearch();
    }
  }, [isConnected, address]);

  const loadAllMessages = async () => {
    try {
      const response = await fetch('/api/nillion-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'readAll'
        }),
      });

      if (!response.ok) throw new Error('Failed to load all messages');
      
      const data = await response.json();
      console.log('📖 All Messages Loaded:', data);
      setAllMessages(data);
    } catch (err) {
      console.error('❌ Load All Messages Error:', err);
      setError(err.message);
    }
  };

  const handleStore = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      console.log('📝 Storing Message:', {
        walletAddress: address,
        message
      });

      const response = await fetch('/api/nillion-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          walletAddress: address,
          message
        }),
      });

      if (!response.ok) throw new Error('Failed to store message');
      
      const result = await response.json();
      console.log('✅ Message Stored Successfully:', result);
      
      setMessage('');
      alert('Message stored successfully!');
      loadAllMessages();
      handleSearch(); // Refresh current wallet's messages
    } catch (err) {
      console.error('❌ Store Message Error:', err);
      setError(err.message);
    }
  };

  const handleSearch = async () => {
    if (!isConnected) return;
    
    try {
      console.log('🔍 Searching Messages for Wallet:', address);

      const response = await fetch('/api/nillion-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          walletAddress: address
        }),
      });

      if (!response.ok) throw new Error('Failed to read messages');
      
      const data = await response.json();
      console.log('📖 Messages Retrieved:', data);
      setMessages(data);
    } catch (err) {
      console.error('❌ Read Messages Error:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (messageId) => {
    if (!isConnected) return;
    
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      console.log('🗑️ Deleting Message:', messageId);

      const response = await fetch('/api/nillion-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          walletAddress: address,
          messageId
        }),
      });

      if (!response.ok) throw new Error('Failed to delete message');
      
      console.log('✅ Message Deleted Successfully');
      
      // Refresh both message lists
      loadAllMessages();
      handleSearch();
    } catch (err) {
      console.error('❌ Delete Message Error:', err);
      setError(err.message);
    }
  };

  return (
    <div>
      <Header />
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Nillion Chat Test</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Store Message Form */}
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Store New Message</h2>
          {!isConnected ? (
            <div className="text-center py-4 text-gray-600">
              Please connect your wallet to store messages
            </div>
          ) : (
            <form onSubmit={handleStore}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Connected Wallet:
                </label>
                <div className="text-gray-600 py-2 px-3 bg-gray-50 rounded">
                  {address}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Message:
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  rows="4"
                  placeholder="Type your message here"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Store Message
              </button>
            </form>
          )}
        </div>

        {/* Display current wallet's messages */}
        {isConnected && messages.length > 0 && (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Messages</h2>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg._id} className="border-b pb-4 relative group">
                  <button
                    onClick={() => handleDelete(msg._id)}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 
                             text-red-500 hover:text-red-700 px-2 py-1 rounded
                             transition-opacity duration-200"
                  >
                    Delete
                  </button>
                  <p className="text-gray-600 text-sm">
                    Time: {new Date(msg.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-2 text-gray-800">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display all messages */}
        {allMessages.length > 0 && (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h2 className="text-xl font-semibold mb-4">All Messages</h2>
            <div className="space-y-4">
              {allMessages.map((msg) => (
                <div key={msg._id} className="border-b pb-4 relative group">
                  {msg.walletAddress === address && (
                    <button
                      onClick={() => handleDelete(msg._id)}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 
                               text-red-500 hover:text-red-700 px-2 py-1 rounded
                               transition-opacity duration-200"
                    >
                      Delete
                    </button>
                  )}
                  <p className="text-gray-600 text-sm">
                    Wallet: {msg.walletAddress}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Time: {new Date(msg.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-2 text-gray-800">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 