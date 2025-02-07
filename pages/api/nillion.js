import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { v4 as uuidv4 } from 'uuid';

const config = {
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

const SCHEMA_ID = 'ac9e4598-d11c-4f13-9372-6ae632bc2280';

let nillionWrapper = null;

async function initNillion() {
  if (!nillionWrapper) {
    nillionWrapper = new SecretVaultWrapper(
      config.nodes,
      config.orgCredentials,
      SCHEMA_ID
    );
    await nillionWrapper.init();
  }
  return nillionWrapper;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const wrapper = await initNillion();
    const { action, walletAddress, chatId, role, content, title } = req.body;

    switch (action) {
      case 'store':
        const message = [{
          _id: uuidv4(),
          walletAddress,
          chatId,
          title,
          role,
          content: { $allot: content },
          timestamp: new Date().toISOString()
        }];
        const result = await wrapper.writeToNodes(message);
        return res.status(200).json(result);

      case 'getChatList':
        const allMessages = await wrapper.readFromNodes({
          walletAddress
        });
        
        // Group by chatId and get latest message for each chat
        const chats = allMessages.reduce((acc, msg) => {
          if (!acc[msg.chatId]) {
            acc[msg.chatId] = {
              id: msg.chatId,
              title: msg.title,
              timestamp: msg.timestamp
            };
          }
          return acc;
        }, {});
        
        return res.status(200).json(Object.values(chats));

      case 'getChatMessages':
        const messages = await wrapper.readFromNodes({
          walletAddress,
          chatId
        });
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        return res.status(200).json(sortedMessages);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Nillion operation failed:', error);
    return res.status(500).json({ error: error.message });
  }
} 