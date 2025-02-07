import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { v4 as uuidv4 } from 'uuid';

class NillionService {
  constructor() {
    this.SCHEMA_ID = 'ac9e4598-d11c-4f13-9372-6ae632bc2280';
    this.collection = null;
    this.config = {
      orgCredentials: {
        secretKey: 'ad462103b2b9f81101a907005a8aa9ec1ff319b05d200dea2dd20e9dac5537ca',
        orgDid: 'did:nil:testnet:nillion1mxquknh937j3gz0kl8sdkwy33krml5f5ya7fdw',
      },
      nodes: [
        {
          url: 'https://nildb-zy8u.nillion.network',
          did: 'did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u',
        },
        {
          url: 'https://nildb-rl5g.nillion.network',
          did: 'did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g',
        },
        {
          url: 'https://nildb-lpjp.nillion.network',
          did: 'did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp',
        },
      ],
    };
  }

  async init() {
    if (!this.collection) {
      this.collection = new SecretVaultWrapper(
        this.config.nodes,
        this.config.orgCredentials,
        this.SCHEMA_ID
      );
      await this.collection.init();
    }
  }

  async createNewChat(walletAddress, firstMessage) {
    const chatId = uuidv4();
    const title = firstMessage.substring(0, 30) + '...';

    const response = await fetch('/api/nillion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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