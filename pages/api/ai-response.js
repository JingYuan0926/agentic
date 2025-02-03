import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { content } = req.body;
        const response = await openai.chat.completions.create({
            model: "gpt-4",  // Using GPT-4
            messages: [{ role: 'user', content }],
            temperature: 0.7,
            max_tokens: 500,
        });

        const aiResponse = response.choices[0].message.content;
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error('AI Response Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
}