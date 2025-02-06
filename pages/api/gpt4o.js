import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: `You are a Solidity smart contract expert. Generate secure smart contracts based on user descriptions.
                    Format your response exactly like this:

                    SOLIDITY_CODE:
                    // Your solidity code here with all necessary components
                    
                    EXPLANATION:
                    1. Deploy the contract:
                       - Network: (specify network)
                       - Initial setup: (any constructor parameters or initial ETH needed)
                    
                    2. For the owner:
                       - Steps to manage the contract
                       - Any special functions only owner can call
                    
                    3. For users:
                       - How to interact with the contract
                       - What functions to call and when
                       - Required parameters or ETH amounts
                    
                    4. Security notes:
                       - Important security considerations
                       - Any time locks or limitations
                    `
                },
                { 
                    role: "user", 
                    content: message 
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        res.status(200).json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
} 