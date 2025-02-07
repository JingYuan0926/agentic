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
        const { message, hasContract, contractAddress, contractContext } = req.body;

        const response = await openai.chat.completions.create({
            model: "meta-llama/Llama-3.3-70B-Instruct",
            messages: [
                {
                    role: 'system',
                    content: `You are an AI that analyzes user intentions for smart contract interactions.
                    Current Context:
                    - Has Connected Contract: ${hasContract}
                    - Contract Address: ${contractAddress || 'None'}
                    - Available Functions: ${contractContext ? JSON.stringify(contractContext.functions) : 'None'}
                    
                    Your task is to:
                    1. If the message contains a contract address (0x...), classify as 'connect_contract'
                    2. If user wants to create a contract, classify as 'generate_contract'
                    3. If user wants to interact with existing contract, classify as 'execute_functions'
                    4. For function execution, identify specific function names and parameters
                    5. For queries about contract state, classify as 'query'
                    
                    Return a structured response with clear intent and actions.`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            functions: [
                {
                    name: "classifyIntent",
                    description: "Classify the user's intention and required actions",
                    parameters: {
                        type: "object",
                        properties: {
                            intent: {
                                type: "string",
                                enum: ["generate_contract", "connect_contract", "execute_functions", "query"]
                            },
                            actions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        params: { type: "array", items: { type: "string" } }
                                    },
                                    required: ["name"]
                                }
                            }
                        },
                        required: ["intent", "actions"]
                    }
                }
            ],
            function_call: { name: "classifyIntent" }
        });

        const result = JSON.parse(response.choices[0].message.function_call.arguments);
        
        // Ensure actions is always an array
        if (!result.actions) {
            result.actions = [];
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            intent: 'unknown',
            actions: [],
            error: error.message 
        });
    }
} 