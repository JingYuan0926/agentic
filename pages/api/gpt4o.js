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
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful AI assistant focused on blockchain and web3 technology." 
                },
                { 
                    role: "user", 
                    content: message 
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        res.status(200).json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
} 