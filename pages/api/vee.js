import OpenAI from 'openai';
import { saveABI } from '../../utils/abiHandler';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

async function generateTeamUpdate(event, details) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
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
            ],
            max_tokens: 100,
            temperature: 0.7
        });

        let message = response.choices[0].message.content;
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

async function analyzeUserIntent(userQuery, contractABI, contractAddress) {
    const contractContext = await buildContractContext(contractABI, contractAddress);
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
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
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
}

export default async function handler(req, res) {
    const logs = [];
    const teamUpdates = [];

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { messages, userQuery, context } = req.body;
        const contractAddress = context?.contractAddress;

        if (!contractAddress) {
            teamUpdates.push(await generateTeamUpdate("no_contract", {}));
            return res.status(400).json({
                success: false,
                message: "No contract address provided",
                teamUpdates
            });
        }

        // Fetch ABI
        try {
            const response = await fetch(`https://evm-testnet.flowscan.io/api/v2/smart-contracts/${contractAddress}`);
            if (!response.ok) throw new Error('Failed to fetch ABI');
            
            const data = await response.json();
            const contractABI = data.abi;

            await saveABI(contractABI, contractAddress);

            teamUpdates.push(await generateTeamUpdate("abi_fetched", { 
                message: "Contract ABI fetched successfully",
                address: contractAddress 
            }));

            // Analyze user intent
            const analysis = await analyzeUserIntent(userQuery, contractABI, contractAddress);
            
            // Find matching function in ABI
            const targetFunction = contractABI.find(item => 
                item.type === 'function' && item.name === analysis.functionName
            );

            if (!targetFunction) {
                teamUpdates.push(await generateTeamUpdate("function_not_found", {
                    query: userQuery
                }));
                return res.status(400).json({
                    success: false,
                    message: "Function not found in contract",
                    teamUpdates
                });
            }

            if (analysis.confidence < 0.7) {
                teamUpdates.push(await generateTeamUpdate("low_confidence", { 
                    confidence: analysis.confidence 
                }));
                return res.status(200).json({
                    success: false,
                    message: "Could not confidently identify function. Please be more specific.",
                    teamUpdates
                });
            }

            teamUpdates.push(await generateTeamUpdate("function_identified", {
                function: targetFunction.name,
                message: `Found matching function ${targetFunction.name}, passing to Dex for parameter extraction.`
            }));

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
            teamUpdates.push(await generateTeamUpdate("abi_error", { error: error.message }));
            return res.status(500).json({
                success: false,
                message: "Failed to fetch contract ABI",
                teamUpdates
            });
        }

    } catch (error) {
        console.error('Vee Error:', error);
        teamUpdates.push(await generateTeamUpdate("error", { error: error.message }));
        return res.status(500).json({
            success: false,
            message: error.message,
            teamUpdates
        });
    }
}
