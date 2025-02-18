import { ethers } from 'ethers';
import { createChatCompletion } from '../../utils/aiConfig';



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

// Cache for contract ABIs
const abiCache = new Map();

// Helper function to get ABI from cache or fetch from contract
const getContractABI = async (contractAddress) => {
    if (abiCache.has(contractAddress)) {
        return abiCache.get(contractAddress);
    }

    try {
        // Fetch ABI from the explorer
        const response = await fetch(`https://evm-testnet.flowscan.io/api/v2/smart-contracts/${contractAddress}`);
        if (!response.ok) throw new Error('Failed to fetch ABI from explorer');
        
        const data = await response.json();
        const abi = data.abi;
        
        abiCache.set(contractAddress, abi);
        return abi;
    } catch (error) {
        console.error('Error getting ABI:', error);
        throw new Error('Failed to get contract ABI from explorer');
    }
};

// Update parseParameter to be more dynamic
const parseParameter = (value, type, paramName) => {
    try {
        if (!value) {
            throw new Error(`Missing value for ${type} parameter`);
        }

        switch (type) {
            case 'uint256':
                if (value.toString().toLowerCase().includes('flow')) {
                    const amount = value.toString().replace(/\s*flows?\s*/i, '');
                    return ethers.parseEther(amount).toString();
                }
                return ethers.parseUnits(value.toString(), 18).toString();
            case 'string':
                // If it's a password parameter, always return "0000"
                if (paramName.toLowerCase().includes('password')) {
                    return "0000";
                }
                return value.toString();
            case 'bytes32':
                // For password parameters, always hash "0000"
                if (paramName.toLowerCase().includes('password')) {
                    return ethers.keccak256(ethers.toUtf8Bytes("0000"));
                }
                if (typeof value === 'string') {
                    if (value.startsWith('0x') && value.length === 66) {
                        return value;
                    }
                    return ethers.keccak256(ethers.toUtf8Bytes(value));
                }
                throw new Error('Invalid bytes32 value');
            default:
                return value;
        }
    } catch (error) {
        throw new Error(`Error parsing ${type} parameter: ${error.message}`);
    }
};

// Update extractParamsFromQuery to use selectedModel
const extractParamsFromQuery = async (userQuery, functionInfo, selectedModel) => {
    try {
        const functionContext = `
            Function: ${functionInfo.name}
            Parameters: ${functionInfo.inputs.map(input => 
                `${input.name} (${input.type})`
            ).join(', ')}
            ${functionInfo.name === 'withdraw' ? 
                'Note: If this is a withdrawal, look for both amount and password in the query.' : 
                ''}
        `;

        const response = await createChatCompletion(selectedModel, [
            {
                role: "system",
                content: `You are a parameter extraction specialist. Extract parameters from the user query based on the function specification.
                ${functionContext}
                Return a JSON object with parameter names as keys and extracted values.
                For passwords: Extract from phrases like "with password X", "using password X", etc.
                For amounts: Look for numeric values with optional 'flow/flows' suffix.
                If a parameter is not found, set it to null.`
            },
            {
                role: "user",
                content: userQuery
            }
        ], { response_format: { type: "json_object" } });

        const extractedParams = JSON.parse(
            selectedModel === 'openai' 
                ? response.choices[0].message.content
                : response.choices[0].message.content
        );
        const params = [];
        const missingParams = [];
        const parameterDetails = [];

        for (const input of functionInfo.inputs) {
            const value = extractedParams[input.name];
            if (value === null || value === undefined) {
                missingParams.push(input.name);
                continue;
            }
            try {
                const parsedValue = parseParameter(value, input.type, input.name);
                params.push(parsedValue);
                parameterDetails.push({
                    name: input.name,
                    type: input.type,
                    originalValue: value,
                    parsedValue: parsedValue
                });
            } catch (error) {
                throw new Error(`Invalid ${input.name}: ${error.message}`);
            }
        }

        if (missingParams.length > 0) {
            // Generate a helpful message for missing parameters
            const helpMessage = await generateParameterHelpMessage(
                functionInfo.name,
                missingParams,
                functionInfo.inputs
            );
            throw new Error(helpMessage);
        }

        // Generate team update about parameter extraction
        const teamUpdate = await generateTeamUpdate('parameter_extraction', {
            function: functionInfo.name,
            parameters: parameterDetails
        }, selectedModel);

        return {
            params,
            teamUpdate,
            parameterDetails // Include for debugging
        };
    } catch (error) {
        throw new Error(`Parameter extraction failed: ${error.message}`);
    }
};

// Helper function to generate parameter help messages
async function generateParameterHelpMessage(functionName, missingParams, allInputs) {
    const response = await createChatCompletion(selectedModel, [
        {
            role: "system",
            content: `Generate a helpful message requesting missing parameters.
            Function: ${functionName}
            Missing: ${missingParams.join(', ')}
            All Inputs: ${JSON.stringify(allInputs)}
            Make it conversational and clear.`
        }
    ]);

    return response.choices[0].message.content;
}

// Update main handler
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { messages, functionInfo, userQuery, contractAddress, selectedModel } = req.body;
        console.log('Processing request:', { functionInfo, userQuery });

        if (!functionInfo || !userQuery) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Handle payable functions using LLM
        if (functionInfo.stateMutability === 'payable') {
            const response = await createChatCompletion(selectedModel, [
                {
                    role: "system",
                    content: `Extract only the numeric amount from the user's deposit request. 
                    Return ONLY a number without any text or symbols.
                    Examples:
                    - "deposit 100 flows" -> "100"
                    - "I want to deposit 50.5 flow" -> "50.5"
                    - "put in 25 flows please" -> "25"`
                },
                {
                    role: "user",
                    content: userQuery
                }
            ], { temperature: 0.1, max_tokens: 10 });

            const content = selectedModel === 'openai' 
                ? response.choices[0].message.content.trim()
                : response.choices[0].message.content.trim();
            
            // Validate the amount is a valid number
            if (!content || isNaN(content)) {
                return res.status(200).json({
                    success: false,
                    message: "Please specify a valid amount to deposit (e.g., 'deposit 100 flows')",
                    needsMoreInfo: true,
                    missingInfo: ['amount']
                });
            }

            return res.status(200).json({
                success: true,
                params: content,
                message: `Ready to deposit ${content} FLOW`,
                teamUpdates: [`Dex: Extracted deposit amount of ${content} FLOW`]
            });
        }

        // Handle other functions
        try {
            const { params, teamUpdate, parameterDetails } = await extractParamsFromQuery(
                userQuery, 
                functionInfo,
                selectedModel
            );
            
            return res.status(200).json({
                success: true,
                params,
                message: `Ready to execute ${functionInfo.name}`,
                teamUpdate,
                debug: { parameterDetails }
            });
        } catch (error) {
            return res.status(200).json({
                success: false,
                message: error.message,
                needsMoreInfo: true,
                missingInfo: error.message.includes('Missing') ? 
                    error.message.split('Missing parameters: ')[1].split(', ') : 
                    ['Invalid input']
            });
        }

    } catch (error) {
        console.error('Dex Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Update generateTeamUpdate to use selectedModel
async function generateTeamUpdate(event, details, selectedModel) {
    try {
        const response = await createChatCompletion(selectedModel, [
            {
                role: "system",
                content: `You are ${dexPersonality.name}, the parameter extraction specialist.
                Create a SHORT team update about the current process.
                Traits:
                - Accuracy: ${dexPersonality.traits.accuracy * 100}%
                - Thoroughness: ${dexPersonality.traits.thoroughness * 100}%
                
                IMPORTANT: Start with "Dex:" and keep it under 2 sentences.
                NEVER use "Assistant:" in your response.`
            },
            {
                role: "user",
                content: `Event: ${event}\nDetails: ${JSON.stringify(details)}`
            }
        ], { temperature: 0.7, max_tokens: 100 });

        let message = selectedModel === 'openai' 
            ? response.choices[0].message.content
            : response.choices[0].message.content;
            
        // Always ensure Dex prefix
        if (!message.startsWith('Dex:')) {
            message = `Dex: ${message.replace(/^(Assistant:|Dex:)?\s*/, '')}`;
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
