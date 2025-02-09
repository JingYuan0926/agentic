import { createChatCompletion } from '../../utils/aiConfig';
import OpenAI from 'openai';

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
            return `Connected to contract ${contractAddress}. Passing to Vee for analysis...`;
        }

        const response = await createChatCompletion(selectedModel, [
            {
                role: "system",
                content: `You are the team coordinator of an AI system.
                Your team members are:
                - Codey: Creates and deploys smart contracts
                - Vee: Identifies contract functions
                - Dex: Extracts function parameters
                - Guard: Monitors security
                
                When users describe any of these scenarios, direct to Codey:
                - Transfers requiring passwords/PINs
                - Time-based conditions
                - Multi-party approvals
                - Custom access controls
                - Any conditional transfers
                - Friend/family payment scenarios with conditions
                
                Based on the intent "${intent}" and contract status, coordinate the team:
                - For "generate": Direct to Codey and mention the specific feature
                - For "connect": Direct to Vee and Dex for interaction
                - For "invalid": Guide the user appropriately
                
                Contract Status: ${contractDetails ? 'Connected' : 'Not Connected'}
                Contract Address: ${contractDetails?.address || 'None'}
                
                IMPORTANT: Keep responses under 2 sentences.`
            },
            {
                role: "user",
                content: `User message: ${message}\nIntent: ${intent}`
            }
        ], { max_tokens: 100, temperature: 0.7 });

        let responseText = selectedModel === 'openai' 
            ? response.choices[0].message.content
            : response.choices[0].message.content;
            
        return responseText.replace(/^(Finn|Guardian|System):\s*/i, '');
    } catch (error) {
        return `I'll help create a secure contract for your password-protected transfer!`;
    }
}

// Modify the intent detection system prompt
const intentClassificationPrompt = `Classify user intentions for smart contract interactions. Look for both explicit and implicit contract needs:

1. "generate" - Any of these cases:
   - Explicit contract creation requests
   - Password/PIN protected transfers
   - Time-locked transfers
   - Friend/family payments with conditions
   - Transfers with approvals
   - Any conditional money movement
   - Phrases like "send money if/when"
   - Mentions of security requirements
   - Custom payment flows
   
2. "invalid" - Completely unrelated requests

Examples:
- "I want to send money to my friend with a password" -> "generate"
- "Transfer ETH when my friend enters 1234" -> "generate"
- "Send funds after approval" -> "generate"
- "What's the weather?" -> "invalid"

Look carefully for implied contract needs in simple transfer requests.
Respond ONLY with "generate" or "invalid".`;

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
                content: intentClassificationPrompt
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