import { v4 as uuidv4 } from 'uuid';

class NillionService {
  async createNewChat(walletAddress, firstMessage) {
    const chatId = uuidv4();
    const title = firstMessage.substring(0, 30) + '...';
    
    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        walletAddress,
        chatId,
        title,
        role: 'user',
        content: firstMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create chat');
    }

    return { chatId, title };
  }

  async storeMessage(walletAddress, chatId, role, content) {
    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        walletAddress,
        chatId,
        role,
        content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to store message');
    }

    return response.json();
  }

  async getChatList(walletAddress) {
    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getChatList',
        walletAddress,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get chat list');
    }

    return response.json();
  }

  async getChatMessages(walletAddress, chatId) {
    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getChatMessages',
        walletAddress,
        chatId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get messages');
    }

    return response.json();
  }

  async deleteChat(walletAddress, chatId) {
    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteChat',
        walletAddress,
        chatId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete chat');
    }

    return response.json();
  }
}

const nillionService = new NillionService();
export default nillionService; 