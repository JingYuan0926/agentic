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

        // Filter out invalid messages and ensure content is string
        const validMessages = messages.filter(msg => 
            msg && 
            typeof msg.content === 'string' && 
            msg.content.trim() !== ''
        );

        // Parse stored context if available
        let storedParams = {};
        let lastInteraction = null;
        if (context?.lastInteraction) {
            try {
                lastInteraction = JSON.parse(context.lastInteraction);
                storedParams = lastInteraction.params || {};
            } catch (e) {
                console.error('Error parsing context:', e);
            }
        }

        // Prepare detailed contract context for the AI
        let contractContext = '';
        let availableFunctions = [];
        if (contractABI) {
            availableFunctions = contractABI.filter(item => item.type === 'function').map(func => ({
                name: func.name,
                inputs: func.inputs,
                outputs: func.outputs,
                stateMutability: func.stateMutability
            }));

            contractContext = `
                Contract Address: ${contractAddress}
                Available Functions:
                ${availableFunctions.map(func => `
                    - ${func.name}:
                      Inputs: ${func.inputs.map(input => `${input.name} (${input.type})`).join(', ')}
                      Stateful: ${func.stateMutability}
                      Returns: ${func.outputs?.map(output => output.type).join(', ') || 'void'}
                `).join('\n')}
                
                Previous context: ${lastInteraction ? `Last interaction attempted to call ${lastInteraction.function.name} with params: ${JSON.stringify(storedParams)}` : 'No previous interaction'}
            `;
        }

        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant that helps users interact with smart contracts. ${contractContext}

            Your tasks:
            1. Understand user intent and map it to contract functions (e.g., "add" → "increment", "deposit" → "depositFunds")
            2. Extract all possible parameters from user messages
            3. Track missing parameters and ask for them specifically
            4. Handle value transfers for payable functions
            5. Provide clear feedback about what will be done

            When handling parameters:
            1. Store any provided parameters
            2. Compare against required parameters for the function
            3. Ask specifically for any missing parameters
            4. Use previously stored parameters if available
            5. Clear stored parameters after successful execution

            Example parameter handling:
            - If a transfer function needs (address, amount)
            - User says "transfer 50 FLOW to 0x123"
            - Store: address=0x123, amount=50
            - Proceed with function call

            Always provide clear, user-friendly responses explaining what's happening.`
        };

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [systemMessage, ...validMessages],
            temperature: 0.7,
            functions: [{
                name: "interactWithContract",
                description: "Interact with the smart contract based on user intent",
                parameters: {
                    type: "object",
                    properties: {
                        functionCall: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Name of the contract function to call" },
                                params: { 
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Parameters for the function call"
                                },
                                value: {
                                    type: "string",
                                    description: "Amount of native tokens to send with the transaction (for payable functions)"
                                }
                            },
                            required: ["name"]
                        },
                        missingParams: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of parameters still needed from the user"
                        },
                        storedParams: {
                            type: "object",
                            description: "Parameters that have been successfully extracted"
                        },
                        explanation: {
                            type: "string",
                            description: "User-friendly explanation of what will be done"
                        }
                    },
                    required: ["explanation"]
                }
            }],
            function_call: "auto"
        });

        const assistantResponse = response.choices[0].message;
        
        let responseData = {
            content: assistantResponse.content || "I understand your request. Let me help you with that."
        };

        if (assistantResponse.function_call) {
            const functionData = JSON.parse(assistantResponse.function_call.arguments);
            
            // If we have missing parameters, store the current ones and ask for the rest
            if (functionData.missingParams?.length > 0) {
                responseData = {
                    content: functionData.explanation,
                    storedParams: functionData.storedParams || {},
                    context: {
                        lastInteraction: JSON.stringify({
                            function: functionData.functionCall,
                            params: functionData.storedParams
                        })
                    }
                };
            } else {
                // We have all parameters, proceed with function call
                responseData = {
                    content: functionData.explanation,
                    functionCall: functionData.functionCall,
                    context: null // Clear context as we're executing the function
                };
            }
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            content: "I encountered an issue processing your request. Could you please try again or rephrase it?" 
        });
    }
} 