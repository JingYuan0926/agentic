import { createChatCompletion } from '../../utils/aiConfig';


// AI Team Configuration
const aiTeam = {
    finn: {
        name: "Finn",
        role: "Intent Analyzer",
        traits: {
            leadership: 0.9,
            vigilance: 0.85,
            coordination: 0.95
        }
    },
    codey: {
        name: "Codey",
        role: "Contract Creator",
        specialty: "generate"
    },
    vee: {
        name: "Vee",
        role: "Function Identifier",
        specialty: "identify"
    },
    dex: {
        name: "Dex",
        role: "Parameter Extractor",
        specialty: "extract"
    },
    guard: {
        name: "Guardian",
        role: "Security Monitor",
        specialty: "security"
    }
};

async function generateTeamResponse(intent, message, contractDetails, selectedModel) {
    try {
        // Check for contract address in message
        const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
            const contractAddress = addressMatch[0];
            return `Finn: Connected to contract ${contractAddress}. Passing to Vee for analysis...`;
        }

        const response = await createChatCompletion(selectedModel, [
            {
                role: "system",
                content: `You are ${aiTeam.finn.name}, the team coordinator of an AI system.
                Your team members are:
                - ${aiTeam.codey.name}: Creates and deploys smart contracts
                - ${aiTeam.vee.name}: Identifies contract functions
                - ${aiTeam.dex.name}: Extracts function parameters
                - ${aiTeam.guard.name}: Monitors security
                
                When users describe desired functionality (like transfers with PINs, 
                time locks, or security features), direct to Codey for contract creation.
                
                Based on the intent "${intent}" and contract status, coordinate the team:
                - For "generate": Direct to Codey and mention the specific feature to be implemented
                - For "connect": Direct to Vee and Dex for contract interaction
                - For "invalid": Guide the user appropriately
                
                Contract Status: ${contractDetails ? 'Connected' : 'Not Connected'}
                Contract Address: ${contractDetails?.address || 'None'}
                
                IMPORTANT: Start with "Finn:" and keep it under 2 sentences.`
            },
            {
                role: "user",
                content: `User message: ${message}\nIntent: ${intent}`
            }
        ], { max_tokens: 100, temperature: 0.7 });

        let responseText = selectedModel === 'openai' 
            ? response.choices[0].message.content
            : response.choices[0].message.content;
            
        if (!responseText.startsWith('Finn:')) {
            responseText = `Finn: ${responseText}`;
        }
        return responseText;
    } catch (error) {
        return `Finn: Directing this to Codey to create a secure contract with your specified requirements!`;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { message, contractDetails, isConnected, selectedModel } = req.body;

        // Check if message contains contract address
        const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
            const contractAddress = addressMatch[0];
            const teamResponse = await generateTeamResponse('connect', message, contractDetails, selectedModel);
            
            return res.status(200).json({
                intent: 'connect',
                teamResponse,
                address: contractAddress,
                nextAgent: aiTeam.vee.name,
                isConnected: true
            });
        }

        // If already connected, only check for generate intent, otherwise pass to Vee
        if (isConnected) {
            const response = await createChatCompletion(selectedModel, [
                {
                    role: 'system',
                    content: `Classify user intentions:
                    1. "generate" - Create new contract
                    2. "interact" - Use existing contract
                    
                    Respond ONLY with one of these words.`
                },
                {
                    role: 'user',
                    content: message
                }
            ], { max_tokens: 10, temperature: 0 });

            const intent = selectedModel === 'openai' 
                ? response.choices[0].message.content.trim().toLowerCase()
                : response.choices[0].message.content.trim().toLowerCase();

            if (intent === 'generate') {
                const teamResponse = await generateTeamResponse(intent, message, contractDetails, selectedModel);
                return res.status(200).json({
                    intent: 'generate',
                    teamResponse,
                    nextAgent: aiTeam.codey.name,
                    isConnected
                });
            }

            // Pass everything else to Vee silently
            return res.status(200).json({
                intent: 'interact',
                teamResponse: null,
                nextAgent: aiTeam.vee.name,
                isConnected
            });
        }

        // Original flow for non-connected state
        const response = await createChatCompletion(selectedModel, [
            {
                role: 'system',
                content: `Classify user intentions for smart contract interactions:
                1. "generate" - Any of these cases:
                   - Explicit contract creation requests
                   - Descriptions of desired contract functionality
                   - Security or access control requirements
                   - Transfer with conditions
                   - Funds with password/PIN protection
                   - Time-locked transfers
                   - Custom payment flows
                   - Any functionality that would require a new contract
                2. "invalid" - Completely unrelated or unclear requests
                
                Examples:
                - "I want to transfer with a password" -> "generate"
                - "Create a contract for secure transfers" -> "generate"
                - "I need funds to be PIN protected" -> "generate"
                - "What's the weather?" -> "invalid"
                
                Respond ONLY with one of these words.`
            },
            {
                role: 'user',
                content: message
            }
        ], { max_tokens: 10, temperature: 0 });

        const intent = selectedModel === 'openai' 
            ? response.choices[0].message.content.trim().toLowerCase()
            : response.choices[0].message.content.trim().toLowerCase();
            
        const teamResponse = await generateTeamResponse(intent, message, contractDetails, selectedModel);

        if (intent === 'generate') {
            return res.status(200).json({
                intent: 'generate',
                teamResponse,
                nextAgent: aiTeam.codey.name,
                isConnected: false
            });
        }

        // Handle invalid or security concerns (only when not connected)
        return res.status(200).json({
            intent: 'invalid',
            teamResponse: `${aiTeam.guard.name}: Please provide a contract address or ask to generate a new contract.`,
            nextAgent: aiTeam.guard.name,
            isConnected: false
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            intent: 'invalid',
            teamResponse: `${aiTeam.guard.name}: System alert! Please try again.`,
            nextAgent: aiTeam.guard.name,
            isConnected: false
        });
    }
}