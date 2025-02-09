import { ethers } from 'ethers';
import { useState } from 'react';
import { useNetworkSwitch } from '../hooks/useNetworkSwitch';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";

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

export default function OnChainProof({ messages, signer, onTransactionComplete, onGeneratingChange }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { switchToHolesky } = useNetworkSwitch();

    const generateProof = async () => {
        if (!signer) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        // Notify parent component that generation started
        onGeneratingChange?.(true);
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
            // Notify parent component that generation finished
            onGeneratingChange?.(false);
        }
    };

    return (
        <div className="mt-4">
            <Button
                onClick={() => setIsModalOpen(true)}
                disabled={isLoading || !messages.length || !signer}
                className={`w-full ${
                    isLoading || !signer || !messages.length
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#823EE4] to-[#37DDDF]'
                } text-white`}
            >
                {isLoading ? 'Generating...' : 'Generate On-Chain Proof'}
            </Button>

            <Modal 
                isOpen={isModalOpen} 
                onOpenChange={setIsModalOpen}
                placement="center"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Generate On-Chain Proof
                            </ModalHeader>
                            <ModalBody>
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="bg-purple-100 rounded-full p-4">
                                        <svg 
                                            width="24" 
                                            height="24" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            className="text-purple-600"
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                        >
                                            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                                            <path d="M2 17L12 22L22 17" />
                                            <path d="M2 12L12 17L22 12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Confirm Proof Generation
                                    </h3>
                                    <p className="text-gray-600">
                                        This will generate an on-chain proof of your conversation. 
                                        The process requires one transaction to be signed.
                                    </p>
                                    {error && (
                                        <p className="text-red-500 text-sm mt-2">{error}</p>
                                    )}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button 
                                    color="danger" 
                                    variant="light" 
                                    onPress={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    color="primary"
                                    onPress={() => {
                                        generateProof();
                                        onClose();
                                    }}
                                    isLoading={isLoading}
                                    className="bg-gradient-to-r from-[#823EE4] to-[#37DDDF] text-white"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="animate-spin mr-2">⚡</span>
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Proof'
                                    )}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
} 