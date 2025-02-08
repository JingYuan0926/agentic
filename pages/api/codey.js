import OpenAI from 'openai';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Main OpenAI instance for contract generation
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Separate OpenAI instance for personality/logging
const personalityAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Codey's personality traits
const codeyPersonality = {
    name: "Codey",
    traits: {
        enthusiasm: 0.8,
        professionalism: 0.7,
        humor: 0.4,
        confidence: 0.9
    },
    catchphrases: [
        "Let's craft some awesome code!",
        "Time to make blockchain magic happen!",
        "Challenge accepted! 💪",
        "This is where the fun begins!"
    ]
};

// Generate team update messages
async function generateTeamUpdate(event, details) {
    try {
        const response = await personalityAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are ${codeyPersonality.name}, reporting progress to the team.
                    Create a SHORT team update message about the current process.
                    IMPORTANT: Start with "Codey:" and keep it under 2 sentences.`
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
        if (!message.startsWith('Codey:')) {
            message = `Codey: ${message}`;
        }
        return message;
    } catch (error) {
        return `Codey: Still working on ${event}...`;
    }
}

// Main handler
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { prompt, signer } = req.body;

        // Send initial SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // 1. Generate Contract using Codey's AI
        res.write(`data: ${JSON.stringify({ status: 'Starting contract generation...', step: 1 })}\n\n`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert Solidity smart contract developer specializing in Flow EVM chain.
                    CRITICAL RULES:
                    1. Start with // SPDX-License-Identifier: MIT
                    2. Use pragma solidity ^0.8.20;
                    3. Name the contract EXACTLY "Contract"
                    4. Include NatSpec comments
                    5. For password protection:
                    - Store password hash as bytes32 private passwordHash
                    - Initialize passwordHash in constructor with keccak256(abi.encodePacked("0099"))
                    - For withdraw, hash the input password and compare with stored hash
                    - Use require(keccak256(abi.encodePacked(_password)) == passwordHash, "Invalid password")
                    - NEVER store or expose raw passwords
                    6. Output ONLY valid Solidity code without markdown backticks
                    7. DO NOT use OpenZeppelin or external libraries
                    8. Include proper error handling and events
                    9. Use payable for functions that involve transactions
                    10. Make contract fully functional and deployable
                    11. NEVER include passwords or their computation in comments or code
                    5. Optimize for Flow EVM chain
                    6. Output ONLY valid Solidity code
                    7. No explanations or markdown
                    8. DO NOT use OpenZeppelin
                    9. Include gas optimizations
                    10. Add appropriate events
                    11. Include proper error handling
                    12. Add input validation
                    13. Make sure the contract is fully functional and can be deployed without ANY changes
                    14. Make sure the contract is optimized for the Flow EVM chain
                    15. Make sure the contract is secure and cannot be exploited
                    16. Make sure the contract is easy to understand and use
                    17. Make sure the contract is easy to deploy and test
                    18. Use payable for functions that involve transactions`
                },
                {
                    role: "user",
                    content: req.body.message || 'Generate a smart contract'
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        let contractCode = response.choices[0].message.content.trim();
        
        // Remove markdown code block indicators if present
        contractCode = contractCode.replace(/```solidity\n/g, '');
        contractCode = contractCode.replace(/```\n?/g, '');

        if (!contractCode.includes('contract Contract')) {
            throw new Error('Invalid contract name. Must be named "Contract"');
        }

        res.write(`data: ${JSON.stringify({ 
            status: 'Contract generated successfully. Attempting to compile...', 
            step: 2,
            contractCode 
        })}\n\n`);

        // 2. Compile contract
        const contractPath = path.join(process.cwd(), 'hardhat/contracts/Contract.sol');
        await writeFile(contractPath, contractCode);

        res.write(`data: ${JSON.stringify({ status: 'Compiling contract...', step: 3 })}\n\n`);
        
        const { stdout: compileOutput, stderr: compileError } = await execAsync('cd hardhat && npx hardhat compile --force');
        
        if (compileError) {
            // If compilation fails, try to fix the contract (following generate.js pattern)
            res.write(`data: ${JSON.stringify({ 
                status: 'Initial compilation failed. Attempting to fix...', 
                step: 3
            })}\n\n`);

            // Generate fixed contract (similar to generate.js lines 140-160)
            const fixResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Fix the following Solidity contract compilation errors..."
                    },
                    { 
                        role: "user", 
                        content: `Original prompt: ${prompt}\nError: ${compileError}\nCode: ${contractCode}` 
                    }
                ]
            });

            contractCode = fixResponse.choices[0].message.content.trim();
            await writeFile(contractPath, contractCode);
            
            // Try compiling again
            const { stderr: recompileError } = await execAsync('cd hardhat && npx hardhat compile --force');
            if (recompileError) {
                throw new Error(`Compilation failed: ${recompileError}`);
            }
        }

        // Read the artifacts
        const artifactsPath = path.join(process.cwd(), 'hardhat/artifacts/contracts/Contract.sol/Contract.json');
        const artifacts = JSON.parse(await readFile(artifactsPath, 'utf8'));

        res.write(`data: ${JSON.stringify({ 
            status: 'Contract compiled successfully! Ready for deployment...', 
            step: 4,
            abi: artifacts.abi,
            bytecode: artifacts.bytecode,
            contractCode
        })}\n\n`);

        // The frontend will handle the actual deployment using ethers.js and MetaMask
        // This matches generate.js implementation (lines 250-270)
        
        res.end();

    } catch (error) {
        console.error('Internal error:', error);
        res.write(`data: ${JSON.stringify({ 
            status: 'Error: ' + error.message,
            error: true
        })}\n\n`);
        res.end();
    }
}
