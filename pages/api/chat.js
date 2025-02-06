import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { messages, contractABI, contractAddress, context } = req.body;

        // Prepare detailed contract context for the AI
        let contractContext = '';
        if (contractABI) {
            const functions = contractABI.filter(item => item.type === 'function').map(func => ({
                name: func.name,
                inputs: func.inputs,
                outputs: func.outputs,
                stateMutability: func.stateMutability
            }));

            contractContext = `
                Contract Address: ${contractAddress}
                Available Functions:
                ${functions.map(func => `
                    - ${func.name}:
                      Inputs: ${func.inputs.map(input => `${input.name} (${input.type})`).join(', ')}
                      Stateful: ${func.stateMutability}
                      Returns: ${func.outputs?.map(output => output.type).join(', ') || 'void'}
                `).join('\n')}
                
                Previous context: ${context?.lastInteraction ? `Last interaction was with function ${JSON.parse(context.lastInteraction).function.name}` : 'No previous interaction'}
            `;
        }

        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant that helps users interact with smart contracts. ${contractContext}

            Your tasks:
            1. Understand user intent in natural language
            2. Map user requests to appropriate contract functions
            3. Extract parameter values from user messages
            4. Handle value transfers for payable functions
            5. Provide clear feedback and ask for missing information

            Examples:
            - "deposit 50 flows" → Call payable function with value 50
            - "add one" → Map to increment() function
            - "what's the current count" → Map to getCount() function

            If parameters are missing or unclear, ask the user specifically for what's needed.
            If multiple functions could match the intent, explain the options and ask for clarification.
            Always provide user-friendly responses explaining what will be done or what information is needed.`
        };

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [systemMessage, ...messages],
            functions: [
                {
                    name: "interactWithContract",
                    description: "Interact with the smart contract based on user intent",
                    parameters: {
                        type: "object",
                        properties: {
                            functionCall: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        description: "Name of the contract function to call"
                                    },
                                    params: {
                                        type: "array",
                                        description: "Parameters for the function call",
                                        items: {
                                            type: "string"
                                        }
                                    },
                                    value: {
                                        type: "string",
                                        description: "Amount of native tokens to send with the transaction (for payable functions)"
                                    }
                                },
                                required: ["name"]
                            },
                            explanation: {
                                type: "string",
                                description: "User-friendly explanation of what will be done"
                            },
                            missingParams: {
                                type: "array",
                                description: "List of missing parameters that need to be requested from user",
                                items: {
                                    type: "string"
                                }
                            }
                        },
                        required: ["explanation"]
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