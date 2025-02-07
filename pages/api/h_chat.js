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
        const { messages, contractABI, contractAddress, context } = req.body;

        // Use the same enhanced system message as chat.js
        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant that helps users interact with smart contracts. 
            ${await buildContractContext(contractABI, contractAddress, context)}

            Your tasks:
            1. Analyze user intent and map to contract functions
            2. For each function call:
               - Check ABI for required parameters
               - If parameters are missing, list them specifically
               - For payable functions, ensure value is specified
               - Validate parameter types match ABI requirements
            3. DO NOT proceed with function calls if any parameters are missing
            4. For transfer functions:
               - Always require amount parameter
               - Validate amount format
               - Check if recipient address is needed
            5. Provide clear feedback about:
               - Which parameters are missing
               - Expected parameter types
               - Example of correct usage

            Remember: Never attempt to execute a function without all required parameters.`
        };

        // Use the same function definition as chat.js
        const response = await openai.chat.completions.create({
            model: "meta-llama/Llama-3.3-70B-Instruct",
            messages: [systemMessage, ...messages],
            functions: [
                {
                    name: "interactWithContract",
                    parameters: {
                        type: "object",
                        properties: {
                            functionCalls: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        params: { type: "array", items: { type: "string" } },
                                        value: { type: "string" },
                                        missingParams: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: { type: "string" },
                                                    type: { type: "string" }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            explanation: { type: "string" },
                            requiresMoreInfo: { type: "boolean" },
                            missingParamsDescription: { type: "string" }
                        },
                        required: ["explanation", "requiresMoreInfo"]
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
            const functionData = JSON.parse(assistantResponse.function_call.arguments);
            
            responseData = {
                ...responseData,
                functionCall: functionData.functionCall,
                explanation: functionData.explanation,
                missingParams: functionData.missingParams,
                alternativeSuggestion: functionData.alternativeSuggestion
            };
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            content: "I'm having trouble processing that request. Could you please try again or rephrase it?" 
        });
    }
} 