import { CdpWalletProvider } from '@coinbase/agentkit';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { walletData } = req.body;

    try {
      // Use the wallet data to configure the wallet provider
      const config = {
        cdpWalletData: walletData,
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        networkId: process.env.NETWORK_ID || 'base-sepolia',
      };

      const walletProvider = await CdpWalletProvider.configureWithWallet(config);

      // Perform any additional operations with the walletProvider here

      res.status(200).json({ message: 'Wallet data processed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process wallet data' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 