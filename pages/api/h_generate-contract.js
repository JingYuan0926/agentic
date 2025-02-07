import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.HYPERBOLIC_API_KEY,
    baseURL: 'https://api.hyperbolic.xyz/v1'
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { prompt, previousCode } = req.body;

        const systemMessage = `You are an expert Solidity smart contract developer. Generate ONLY the complete contract code without any explanations or markdown formatting. Follow these rules:

1. Start with // SPDX-License-Identifier: MIT
2. Use pragma solidity ^0.8.20;
3. Name the contract "Contract"
4. Include NatSpec comments for functions
5. Include proper error handling
6. Make code gas efficient
7. Output ONLY valid Solidity code
8. No explanations, no markdown, no additional text
9. If fixing compilation errors, maintain core functionality
10. Code must be immediately compilable

Example format:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    // Contract code here
}`;

        const response = await openai.chat.completions.create({
            model: "meta-llama/Llama-3.3-70B-Instruct",
            messages: [
                { role: "system", content: systemMessage },
                ...(previousCode ? [{ 
                    role: "system", 
                    content: `Fix compilation errors in: ${previousCode}`
                }] : []),
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2500
        });

        // Extract only the contract code, removing any markdown or explanations
        let contractCode = response.choices[0].message.content.trim();
        
        // If the response contains markdown code blocks, extract only the code
        if (contractCode.includes('```')) {
            contractCode = contractCode.split('```')[1]
                .replace('solidity', '')
                .replace('javascript', '')
                .trim();
        }

        // Ensure the code starts with SPDX license
        if (!contractCode.startsWith('// SPDX-License-Identifier')) {
            contractCode = '// SPDX-License-Identifier: MIT\n' + contractCode;
        }

        // Ensure proper pragma
        if (!contractCode.includes('pragma solidity')) {
            contractCode = contractCode.replace(
                '// SPDX-License-Identifier: MIT\n',
                '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n'
            );
        }

        // Validate basic structure
        if (!contractCode.includes('contract Contract')) {
            contractCode = contractCode.replace(
                /contract\s+(\w+)\s*{/,
                'contract Contract {'
            );
        }

        res.status(200).json({ success: true, contractCode });

    } catch (error) {
        console.error('Error generating contract:', error);
        res.status(500).json({ success: false, error: error.message });
    }
} 