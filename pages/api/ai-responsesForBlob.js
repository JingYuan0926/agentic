export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, agent } = req.body;

    // Process based on agent type
    let response = '';
    switch(agent) {
      case 'analyzer':
        response = `Analyzing contract requirements: ${message}`;
        break;
      case 'templater':
        response = `Finding suitable template for: ${message}`;
        break;
      case 'customizer':
        response = `Customizing contract with: ${message}`;
        break;
      case 'validator':
        response = `Validating contract: ${message}`;
        break;
      default:
        response = 'Unknown agent';
    }

    res.status(200).json({ response });
  } catch (error) {
    console.error('AI Response Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
} 