import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Cache for contract ABIs
const abiCache = new Map();

async function fetchContractDetails(contractAddress) {
    try {
        const response = await fetch(`https://evm-testnet.flowscan.io/api/v2/smart-contracts/${contractAddress}`);
        if (!response.ok) {
            console.error('Explorer API response:', await response.text());
            throw new Error('Failed to fetch contract details');
        }
        
        const data = await response.json();
        
        if (data.abi) {
            abiCache.set(contractAddress, data.abi);
        }

        return {
            sourceCode: data.sourceCode || data.source,
            abi: data.abi
        };
    } catch (error) {
        if (abiCache.has(contractAddress)) {
            return {
                abi: abiCache.get(contractAddress),
                sourceCode: null
            };
        }
        console.error('Error fetching contract:', error);
        throw new Error('Unable to fetch contract details from explorer');
    }
}

async function generateExplanation(sourceCode, abi) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: "system",
                    content: `You are a smart contract expert. Explain each function in a simple way.
                    Format your response exactly like this:
                    Here's what you can do with your new contract:
                    function_name: what this function does and how to use it
                    function_name: what this function does and how to use it
                    (and so on for each function)
                    
                    Keep explanations simple and direct. No markdown formatting.
                    New line for each function.`
                },
                {
                    role: "user",
                    content: `Please explain this smart contract:
                    Source Code:
                    ${sourceCode}
                    
                    ABI:
                    ${JSON.stringify(abi, null, 2)}
                    
                    List each function and explain what it does.`
                }
            ],
            max_tokens: 500,
            temperature: 0.3
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating explanation:', error);
        throw new Error('Failed to generate contract explanation');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { contractAddress } = req.body;

        if (!contractAddress) {
            return res.status(400).json({
                success: false,
                error: 'Contract address is required'
            });
        }

        const contractDetails = await fetchContractDetails(contractAddress);
        const explanation = await generateExplanation(
            contractDetails.sourceCode,
            contractDetails.abi
        );

        return res.status(200).json({
            success: true,
            explanation,
            contractDetails: {
                address: contractAddress,
                hasSourceCode: !!contractDetails.sourceCode,
                hasAbi: !!contractDetails.abi
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to explain contract'
        });
    }
}
