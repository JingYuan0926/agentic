import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { prompt, previousCode } = req.body;

        const systemMessage = `You are an expert Solidity smart contract developer. Generate smart contracts based on user requirements following these strict rules:
1. Always use Solidity version 0.8.20
2. Always name the contract as "Contract"
3. Include detailed NatSpec comments for all functions
4. Use proper error handling and require statements
5. Follow security best practices
6. Make code gas efficient
7. If previous code failed compilation, fix the issues while maintaining the core functionality

Generate only the contract code without any explanations. The code should start with // SPDX-License-Identifier: MIT and include the pragma statement.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemMessage },
                ...(previousCode ? [{ 
                    role: "system", 
                    content: `Previous code that needs fixing: ${previousCode}`
                }] : []),
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2500
        });

        const contractCode = response.choices[0].message.content.trim();
        res.status(200).json({ success: true, contractCode });

    } catch (error) {
        console.error('Error generating contract:', error);
        res.status(500).json({ success: false, error: error.message });
    }
} 