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
        const userMessage = messages[messages.length - 1].content;

        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant that helps users interact with smart contracts.
            ${await buildContractContext(contractABI, contractAddress, context)}

            STRICT INTERACTION RULES:
            1. Function Identification:
               - Analyze user message to identify intended function from ABI
               - Match using natural language understanding
               - If no match found, ask user to rephrase
            
            2. Parameter Collection:
               - Check ABI for required parameters
               - Extract parameters from user message if present
               - For ANY missing parameter, do not proceed with execution
               - Instead, ask user specifically for each missing parameter
               - Only return functionCall when ALL parameters are properly provided
            
            3. Multiple Function Detection:
               - Check if user message contains multiple function calls
               - Handle each function call separately
               - Track parameters for each call independently
            
            4. Response Format:
               When parameters are missing:
               {
                 "requiresMoreInfo": true,
                 "explanation": "Please provide [specific parameter]",
                 "functionName": "[identified function]",
                 "missingParams": ["param1", "param2"]
               }
               
               When ready to execute:
               {
                 "requiresMoreInfo": false,
                 "functionCalls": [{
                   "name": "[function name]",
                   "params": ["actual", "values"],
                   "value": "numeric_amount_if_needed"
                 }]
               }

            Current ABI:
            ${JSON.stringify(contractABI, null, 2)}

            Previous Context:
            ${context?.lastInteraction ? JSON.stringify(context.lastInteraction) : 'No previous interaction'}
            `
        };

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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
                                        value: { type: "string" }
                                    }
                                }
                            },
                            requiresMoreInfo: { type: "boolean" },
                            explanation: { type: "string" },
                            missingParams: { 
                                type: "array", 
                                items: { type: "string" } 
                            }
                        },
                        required: ["requiresMoreInfo"]
                    }
                }
            ],
            function_call: { name: "interactWithContract" }
        });

        const assistantResponse = response.choices[0].message;
        const functionData = assistantResponse.function_call 
            ? JSON.parse(assistantResponse.function_call.arguments)
            : null;

        // Format response based on whether more info is needed
        const responseData = {
            content: functionData.requiresMoreInfo 
                ? functionData.explanation 
                : "Ready to execute the function(s).",
            requiresMoreInfo: functionData.requiresMoreInfo,
            functionCalls: !functionData.requiresMoreInfo ? functionData.functionCalls : null,
            missingParams: functionData.requiresMoreInfo ? functionData.missingParams : null
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            content: "I'm having trouble processing that request. Could you please try again?" 
        });
    }
}

// Helper function to build detailed contract context
const buildContractContext = async (abi, address, context) => {
    if (!abi) return '';
    
    const functions = abi.filter(item => item.type === 'function')
        .map(func => ({
            name: func.name,
            inputs: func.inputs,
            outputs: func.outputs,
            stateMutability: func.stateMutability
        }));

    return `
        Contract Context:
        Address: ${address}
        Available Functions:
        ${functions.map(func => `
            - ${func.name}:
              Inputs: ${func.inputs.map(input => `${input.name} (${input.type})`).join(', ')}
              Stateful: ${func.stateMutability}
              Returns: ${func.outputs?.map(output => output.type).join(', ') || 'void'}
        `).join('\n')}
        
        Previous Context: ${context?.lastInteraction ? 
            `Last interaction: ${JSON.parse(context.lastInteraction).function.name}` : 
            'No previous interaction'}
    `;
};
