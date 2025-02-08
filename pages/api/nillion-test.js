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
    const { action, walletAddress, message, chatId } = req.body;

    console.log('🔄 API Request:', { action, walletAddress, message, chatId });

    switch (action) {
      case 'store':
        const newChatId = chatId || uuidv4();
        const data = [{
          _id: uuidv4(),
          walletAddress,
          message,
          chatId: newChatId,
          timestamp: new Date().toISOString()
        }];
        
        console.log('💾 Storing Data:', JSON.stringify(data, null, 2));
        const result = await wrapper.writeToNodes(data);
        console.log('✅ Store Result:', result);
        return res.status(200).json({ ...result, chatId: newChatId });

      case 'read':
        console.log('🔍 Reading Data for Wallet:', walletAddress);
        const messages = await wrapper.readFromNodes({
          walletAddress,
          chatId
        });
        console.log('📖 Read Result:', messages);
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        return res.status(200).json(sortedMessages[0] || null);

      case 'readAll':
        console.log('📚 Reading All Data');
        const allMessages = await wrapper.readFromNodes({});
        const sortedAllMessages = allMessages.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        console.log('📚 Read All Result:', sortedAllMessages);
        return res.status(200).json(sortedAllMessages);

      case 'delete':
        console.log('🗑️ Deleting Message:', message);
        const deleteFilter = {
          _id: message,
          walletAddress // Include wallet address to ensure users can only delete their own messages
        };
        const deleteResult = await wrapper.deleteDataFromNodes(deleteFilter);
        console.log('✅ Delete Result:', deleteResult);
        return res.status(200).json({ success: true });

      default:
        console.warn('⚠️ Invalid Action:', action);
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('❌ Nillion operation failed:', error);
    return res.status(500).json({ error: error.message });
  }
} 