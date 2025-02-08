import OpenAI from 'openai';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { getABI } from '../../utils/abiHandler';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const dexPersonality = {
    name: "Dex",
    traits: {
        accuracy: 0.9,
        thoroughness: 0.95,
        helpfulness: 0.8,
        patience: 0.9
    },
    catchphrases: [
        "Let me extract those parameters for you!",
        "Checking parameter types...",
        "Almost there, just need a few more details!",
        "Parameters validated and ready to go!"
    ]
};

async function generateTeamUpdate(event, details) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are ${dexPersonality.name}, the parameter extraction specialist.
                    Create a SHORT team update about the current process.
                    Traits:
                    - Accuracy: ${dexPersonality.traits.accuracy * 100}%
                    - Thoroughness: ${dexPersonality.traits.thoroughness * 100}%
                    
                    IMPORTANT: Start with "Dex:" and keep it under 2 sentences.`
                },
                {
                    role: "user",
                    content: `Event: ${event}\nDetails: ${JSON.stringify(details)}`
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        });

        let message = response.choices[0].message.content;
        if (!message.startsWith('Dex:')) {
            message = `Dex: ${message}`;
        }
        return message;
    } catch (error) {
        return `Dex: Processing parameters for ${event}...`;
    }
}

// Add helper function from chat.js
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

// Add the FunctionCall data structure
class FunctionCall {
    constructor(name) {
        this.name = name;
        this.params = new Map();
        this.timestamp = Date.now();
    }

    addParameter(type, name, value) {
        this.params.set(name, {
            type: type,
            value: value
        });
    }

    toJSON() {
        return {
            name: this.name,
            params: Object.fromEntries(this.params),
            timestamp: this.timestamp
        };
    }
}

// Update the parameter extraction function
async function extractAndValidateParameters(userQuery, functionInfo) {
    try {
        // Validate functionInfo structure
        if (!functionInfo || !functionInfo.name) {
            console.error('Invalid function info:', functionInfo);
            return {
                success: false,
                message: "Invalid function information"
            };
        }

        // Create function call instance
        const functionCall = new FunctionCall(functionInfo.name);
        
        // Handle functions with no inputs
        if (!functionInfo.inputs || functionInfo.inputs.length === 0) {
            return {
                success: true,
                functionCall: functionCall.toJSON(),
                params: {}  // Empty params for functions with no inputs
            };
        }

        // For functions with inputs, extract parameters using GPT
        const analysis = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Extract parameters for ${functionInfo.name} function.
                    Function inputs: ${JSON.stringify(functionInfo.inputs)}
                    Return parameters in JSON format matching the input types.
                    For payable functions, include "amount" parameter.`
                },
                {
                    role: "user",
                    content: userQuery
                }
            ],
            response_format: { type: "json_object" }
        });

        const extractedValues = JSON.parse(analysis.choices[0].message.content);
        
        // Add parameters based on function type and inputs
        if (functionInfo.stateMutability === 'payable') {
            functionCall.addParameter('uint256', 'amount', extractedValues.amount || '0');
        } else {
            // Add other parameters based on function inputs
            functionInfo.inputs.forEach(input => {
                if (extractedValues[input.name]) {
                    functionCall.addParameter(input.type, input.name, extractedValues[input.name]);
                }
            });
        }

        return {
            success: true,
            functionCall: functionCall.toJSON(),
            params: Object.fromEntries(functionCall.params)
        };
    } catch (error) {
        console.error('Parameter extraction error:', error);
        return {
            success: false,
            message: `Parameter extraction failed: ${error.message}`
        };
    }
}

// Update the execution function
async function extractAndExecuteFunction(userQuery, functionInfo) {
    try {
        console.log('Processing function:', {
            name: functionInfo.name,
            userQuery,
            stateMutability: functionInfo.stateMutability,
            inputs: functionInfo.inputs
        });

        const paramData = await extractAndValidateParameters(userQuery, functionInfo);
        
        if (!paramData.success) {
            return {
                success: false,
                message: paramData.message
            };
        }

        // Create message based on function type
        let executionMessage = `Ready to execute ${functionInfo.name}`;
        if (Object.keys(paramData.params).length > 0) {
            executionMessage += ` with parameters: ${JSON.stringify(paramData.params)}`;
        }

        return {
            success: true,
            functionCall: paramData.functionCall,
            params: paramData.params,
            message: executionMessage
        };
    } catch (error) {
        console.error('Function execution error:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Update the handler
export default async function handler(req, res) {
    const logs = [];
    const teamUpdates = [];

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { messages, functionInfo, userQuery } = req.body;

        // Log received data
        console.log('Received request:', {
            functionInfo,
            userQuery,
            hasMessages: !!messages
        });

        // Validate required fields
        if (!functionInfo || !userQuery) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                details: {
                    hasFunctionInfo: !!functionInfo,
                    hasUserQuery: !!userQuery
                },
                logs,
                teamUpdates
            });
        }

        // Extract and prepare for execution
        const result = await extractAndExecuteFunction(userQuery, functionInfo);

        // Add team update about the preparation
        teamUpdates.push(await generateTeamUpdate(
            "function_prepared",
            {
                function: functionInfo.name,
                params: result.params,
                ready: result.success
            }
        ));

        return res.status(200).json({
            ...result,
            logs,
            teamUpdates
        });

    } catch (error) {
        console.error('Dex Error:', error);
        logs.push(`Error: ${error.message}`);
        teamUpdates.push(await generateTeamUpdate("error_occurred", { error: error.message }));
        return res.status(500).json({ 
            success: false,
            message: "Error processing request",
            logs,
            teamUpdates
        });
    }
}

// Helper function to validate parameter types
function validateParam(value, type) {
    try {
        switch (type) {
            case 'uint256':
            case 'uint':
                return !isNaN(value) && parseInt(value) >= 0;
            case 'address':
                return /^0x[a-fA-F0-9]{40}$/.test(value);
            case 'bool':
                return typeof value === 'boolean' || ['true', 'false'].includes(value.toLowerCase());
            case 'string':
                return typeof value === 'string';
            default:
                return true; // For unknown types, assume valid
        }
    } catch (error) {
        return false;
    }
}
