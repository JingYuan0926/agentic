import { initializeAgent } from '../../agentkit/typescript/examples/langchain-cdp-chatbot/chatbot';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { walletData } = req.body;

    try {
      // Directly pass the wallet data to the agent kit
      const { agent, config } = await initializeAgent(walletData);

      // Perform any additional operations with the agent here

      res.status(200).json({ message: 'Wallet data processed successfully', config });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process wallet data' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}