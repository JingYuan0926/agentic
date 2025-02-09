import { createChatCompletion } from '../../utils/aiConfig';
import OpenAI from 'openai';

const veePersonality = {
    name: "Vee",
    traits: {
        precision: 0.9,
        helpfulness: 0.8,
        technical: 0.9,
        formality: 0.7
    },
    catchphrases: [
        "Analyzing contract functions...",
        "Let me identify the right function for you!",
        "I found a matching function!",
        "Scanning ABI for the perfect match..."
    ]
};

async function generateTeamUpdate(event, details, selectedModel) {
    try {
        const response = await createChatCompletion(selectedModel, [
            {
                role: "system",
                content: `You are ${veePersonality.name}, the contract function analyzer.
                Create a SHORT team update about the current process.
                Traits:
                - Precision: ${veePersonality.traits.precision * 100}%
                - Technical: ${veePersonality.traits.technical * 100}%
                
                IMPORTANT: Start with "Vee:" and keep it under 2 sentences.`
            },
            {
                role: "user",
                content: `Event: ${event}\nDetails: ${JSON.stringify(details)}`
            }
        ], { temperature: 0.7, max_tokens: 100 });

        let message = selectedModel === 'openai' 
            ? response.choices[0].message.content
            : response.choices[0].message.content;
            
        if (!message.startsWith('Vee:')) {
            message = `Vee: ${message}`;
        }
        return message;
    } catch (error) {
        return `Vee: Analyzing function ${event}...`;
    }
}

const buildContractContext = async (abi, address) => {
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
    `;
};

async function analyzeUserIntent(userQuery, contractABI, contractAddress, selectedModel) {
    const contractContext = await buildContractContext(contractABI, contractAddress);
    
    const response = await createChatCompletion(selectedModel, [
        {
            role: "system",
            content: `You are Vee, analyzing smart contract functions.
            ${contractContext}
            
            Identify the most suitable function based on the user's request.
            Return JSON with:
            {
                "functionName": "exact function name",
                "confidence": 0-1 score,
                "reasoning": "why this function matches"
            }`
        },
        {
            role: "user",
            content: userQuery
        }
    ], { 
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500
    });

    const content = selectedModel === 'openai' 
        ? response.choices[0].message.content
        : response.choices[0].message.content;
        
    try {
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to parse JSON response:', error);
        throw new Error('Failed to analyze user intent');
    }
}

// Helper function to get ABI from cache or fetch from contract
const abiCache = new Map();

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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { messages, userQuery, context, selectedModel } = req.body;
    const logs = [];
    const teamUpdates = [];

    try {
        const contractAddress = context?.contractAddress;

        if (!contractAddress) {
            teamUpdates.push(await generateTeamUpdate("no_contract", {}, selectedModel));
            return res.status(400).json({
                success: false,
                message: "No contract address provided",
                teamUpdates
            });
        }

        try {
            const contractABI = await getContractABI(contractAddress);
            
            teamUpdates.push(await generateTeamUpdate("abi_fetched", { 
                message: "Contract ABI fetched successfully",
                address: contractAddress 
            }, selectedModel));

            // Analyze user intent with selected model
            const analysis = await analyzeUserIntent(userQuery, contractABI, contractAddress, selectedModel);
            
            // Find matching function in ABI
            const targetFunction = contractABI.find(item => 
                item.type === 'function' && item.name === analysis.functionName
            );

            if (!targetFunction) {
                teamUpdates.push(await generateTeamUpdate("function_not_found", {
                    query: userQuery
                }, selectedModel));
                return res.status(400).json({
                    success: false,
                    message: "Function not found in contract",
                    teamUpdates
                });
            }

            if (analysis.confidence < 0.7) {
                teamUpdates.push(await generateTeamUpdate("low_confidence", { 
                    confidence: analysis.confidence 
                }, selectedModel));
                return res.status(200).json({
                    success: false,
                    message: "Could not confidently identify function. Please be more specific.",
                    teamUpdates
                });
            }

            teamUpdates.push(await generateTeamUpdate("function_identified", {
                function: targetFunction.name,
                message: `Found matching function ${targetFunction.name}, passing to Dex for parameter extraction.`
            }, selectedModel));

            // Return function details to Dex
            return res.status(200).json({
                success: true,
                message: "Function identified successfully",
                contractAddress,
                contractABI,
                function: {
                    name: targetFunction.name,
                    signature: `${targetFunction.name}(${targetFunction.inputs.map(i => i.type).join(',')})`,
                    inputs: targetFunction.inputs,
                    outputs: targetFunction.outputs,
                    stateMutability: targetFunction.stateMutability
                },
                reasoning: analysis.reasoning,
                saveToLocalStorage: {
                    key: 'veeContractABI',
                    data: {
                        address: contractAddress,
                        abi: contractABI,
                        timestamp: Date.now()
                    }
                },
                teamUpdates
            });

        } catch (error) {
            console.error('ABI fetch error:', error);
            teamUpdates.push(await generateTeamUpdate("abi_error", { error: error.message }, selectedModel));
            return res.status(500).json({
                success: false,
                message: "Failed to fetch contract ABI",
                teamUpdates
            });
        }

    } catch (error) {
        console.error('Vee Error:', error);
        teamUpdates.push(await generateTeamUpdate("error", { error: error.message }, selectedModel));
        return res.status(500).json({
            success: false,
            message: error.message,
            teamUpdates
        });
    }
}
