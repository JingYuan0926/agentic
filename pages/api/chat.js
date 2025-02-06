import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { messages, contractABI, contractAddress } = req.body;

        // Prepare system message with contract context
        const systemMessage = {
            role: 'system',
            content: contractABI 
                ? `You are an AI assistant that helps users interact with smart contracts. You have access to a contract at ${contractAddress}. 
                   The contract's ABI is: ${JSON.stringify(contractABI)}. 
                   Analyze the ABI to understand the contract's capabilities and help users interact with it.
                   When functions are executed, interpret the results in a user-friendly way based on the functions' purposes.
                   You can execute multiple functions in sequence if the user's request requires it.`
                : 'You are an AI assistant that helps users interact with smart contracts. You can help users connect to contracts by detecting contract addresses in their messages.'
        };

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [systemMessage, ...messages],
            functions: [
                {
                    name: "executeContractFunctions",
                    description: "Execute one or more functions on the smart contract",
                    parameters: {
                        type: "object",
                        properties: {
                            functions: {
                                type: "array",
                                description: "Array of functions to execute in sequence",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: {
                                            type: "string",
                                            description: "Name of the contract function to execute"
                                        },
                                        params: {
                                            type: "array",
                                            description: "Parameters for the function call",
                                            items: {
                                                type: "string"
                                            }
                                        }
                                    },
                                    required: ["name"]
                                }
                            }
                        },
                        required: ["functions"]
                    }
                }
            ]
        });

        const assistantResponse = response.choices[0].message;

        // Check for contract address in user message
        const addressMatch = messages[messages.length - 1].content.match(/0x[a-fA-F0-9]{40}/);
        
        let responseData = {
            content: assistantResponse.content
        };

        if (addressMatch && !contractABI) {
            responseData.contractAddress = addressMatch[0];
        }

        if (assistantResponse.function_call) {
            const functionCall = JSON.parse(assistantResponse.function_call.arguments);
            if (functionCall.functions && Array.isArray(functionCall.functions)) {
                responseData.executeFunctions = functionCall.functions.map(func => ({
                    name: func.name,
                    params: func.params || []
                }));
            }
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
} 