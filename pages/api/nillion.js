import { SecretVaultWrapper } from 'nillion-sv-wrappers';

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
    const { action, role, content } = req.body;

    switch (action) {
      case 'store':
        const message = [{
          role,
          content: { $allot: content },
          timestamp: new Date().toISOString()
        }];
        const result = await wrapper.writeToNodes(message);
        return res.status(200).json(result);

      case 'get':
        const messages = await wrapper.readFromNodes({});
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