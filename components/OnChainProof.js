import { ethers } from 'ethers';
import { useState } from 'react';
import { useNetworkSwitch } from '../hooks/useNetworkSwitch';

// ABI matching exactly with respondToTask.js
const abi = [
    'function operatorRegistered(address) external view returns (bool)',
    'function aiPublicKey() external view returns (address)',
    'function createNewTask(bytes32 hashBeforeSign, bytes memory signature) external returns (tuple(bytes32 hashBeforeSign, bytes signature))',
    'function respondToTask(tuple(bytes32 hashBeforeSign, bytes signature) task, uint32 referenceTaskIndex, string response, bytes signature) external',
    'event NewTaskCreated(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task)',
    'event TaskResponded(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task, string response, address operator)'
];

const contractAddress = '0x610c598A1B4BF710a10934EA47E4992a9897fad1';

export default function OnChainProof({ messages, signer, onTransactionComplete }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { switchToHolesky } = useNetworkSwitch();

    const generateProof = async () => {
        if (!signer) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            // Switch to Holesky network
            const { provider, signer: holeskySigner } = await switchToHolesky();
            if (!provider || !holeskySigner) {
                throw new Error('Failed to switch to Holesky network');
            }

            // Create contract instance
            const contract = new ethers.Contract(contractAddress, abi, provider);

            // Initialize AI wallet for signing
            if (!process.env.NEXT_PUBLIC_AI_PRIVATE_KEY) {
                throw new Error('AI private key not configured');
            }
            const aiWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_AI_PRIVATE_KEY, provider);

            // Convert messages array to string
            const chatContent = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            // Create hash of content
            const hashBeforeSign = ethers.keccak256(ethers.toUtf8Bytes(chatContent));
            console.log('Hash before sign:', hashBeforeSign);

            // Get AI signature
            const messageBytes = ethers.getBytes(hashBeforeSign);
            const signature = await aiWallet.signMessage(messageBytes);
            console.log('AI Signature:', signature);

            // Create contract instance with signer
            const contractWithSigner = contract.connect(holeskySigner);

            // Submit task
            const tx = await contractWithSigner.createNewTask(
                hashBeforeSign,
                signature,
                { gasLimit: 500000 }
            );

            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction receipt:', receipt);

            // Get task index from event
            const event = receipt.logs
                .map(log => {
                    try {
                        return contract.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find(event => event && event.name === 'NewTaskCreated');

            if (!event) {
                throw new Error('Could not find NewTaskCreated event');
            }

            const taskIndex = event.args[0];
            console.log('Task Index:', taskIndex);

            // Call operator response API
            const operatorResponse = await fetch('/api/operator-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskIndex: taskIndex.toString(),
                    hashBeforeSign,
                    signature
                })
            });

            if (!operatorResponse.ok) {
                const error = await operatorResponse.json();
                throw new Error(error.message || 'Failed to get operator response');
            }

            const operatorData = await operatorResponse.json();

            // Call the callback with transaction data
            if (onTransactionComplete) {
                onTransactionComplete({
                    createTaskHash: tx.hash,
                    responseHash: operatorData.transactionHash
                });
            }

        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <button
                onClick={generateProof}
                disabled={isLoading || !messages.length || !signer}
                className={`w-full px-4 py-2 rounded ${
                    isLoading || !signer || !messages.length
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors flex items-center justify-center gap-2`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating Proof...</span>
                    </>
                ) : !signer ? (
                    'Connect Wallet First'
                ) : !messages.length ? (
                    'No Messages to Prove'
                ) : (
                    'Generate On-Chain Proof'
                )}
            </button>
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
} 