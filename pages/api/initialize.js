import { initializeAgent } from '../../agentkit/typescript/examples/langchain-cdp-chatbot/chatbot';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { agent, config } = await initializeAgent();
      res.status(200).json({ message: 'Agent initialized successfully', config });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize agent' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 