import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { v4 as uuidv4 } from 'uuid';
import config from '../../nillionConfig/nillion.json' assert { type: 'json' };
import schemaConfig from '../../nillionConfig/schemaId.json' assert { type: 'json' };

const SCHEMA_ID = schemaConfig.schemaId;

let nillionWrapper = null;

async function initNillion() {
  if (!nillionWrapper) {
    nillionWrapper = new SecretVaultWrapper(
      config.orgConfig.nodes,
      config.orgConfig.orgCredentials,
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

      case 'deleteChat':
        const deleteFilter = {
          walletAddress,
          chatId
        };
        
        const deleteResult = await wrapper.deleteDataFromNodes(deleteFilter);
        return res.status(200).json({ success: true });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Nillion operation failed:', error);
    return res.status(500).json({ error: error.message });
  }
} 