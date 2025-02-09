import { ethers } from 'ethers';
import { useState, useEffect } from 'react';

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
const HOLESKY_CHAIN_ID = '0x4268'; // Chain ID for Holesky

export default function OnChainProof({ messages, signer, onTransactionComplete, setIsGeneratingProof }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

    // Add network check effect
    useEffect(() => {
        const checkNetwork = async () => {
            if (window.ethereum && signer) {
                const network = await window.ethereum.request({ method: 'eth_chainId' });
                setIsCorrectNetwork(network === HOLESKY_CHAIN_ID);
            }
        };
        checkNetwork();
    }, [signer]);

    const switchToHolesky = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: HOLESKY_CHAIN_ID }],
            });
            setIsCorrectNetwork(true);
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: HOLESKY_CHAIN_ID,
                            chainName: 'Holesky Testnet',
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://ethereum-holesky.publicnode.com'],
                            blockExplorerUrls: ['https://holesky.etherscan.io']
                        }]
                    });
                    setIsCorrectNetwork(true);
                } catch (addError) {
                    throw addError;
                }
            } else {
                throw switchError;
            }
        }
    };

    const generateProof = async () => {
        setIsLoading(true);
        setError(null);
        setIsGeneratingProof(true);
        
        try {
            if (!signer) {
                throw new Error('Please connect your wallet first');
            }

            // Automatically switch network if needed
            if (!isCorrectNetwork) {
                await switchToHolesky();
            }

            // Create provider and contract instances
            const provider = new ethers.JsonRpcProvider('https://ethereum-holesky.publicnode.com');
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
            const contractWithSigner = contract.connect(signer);

            // Encode function data for createNewTask
            const data = contract.interface.encodeFunctionData('createNewTask', [
                hashBeforeSign,
                signature
            ]);
            console.log('Encoded function data:', data);

            // Submit task with encoded data
            const tx = await contractWithSigner.createNewTask(
                hashBeforeSign,
                signature,
                {
                    gasLimit: 500000
                }
            );

            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction receipt:', receipt);

            if (receipt.status === 0) {
                throw new Error('Transaction failed');
            }

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

            // Initialize operator wallet
            if (!process.env.NEXT_PUBLIC_OPERATOR_PRIVATE_KEY) {
                throw new Error('Operator private key not configured');
            }
            const operatorWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_OPERATOR_PRIVATE_KEY, provider);
            
            // Create operator signature
            const messageHash = ethers.keccak256(
                ethers.solidityPacked(
                    ['bool', 'bytes32'],
                    [true, hashBeforeSign]
                )
            );
            const operatorSignature = await operatorWallet.signMessage(ethers.getBytes(messageHash));

            // Submit operator response
            const operatorContract = contract.connect(operatorWallet);
            const responseTx = await operatorContract.respondToTask(
                {
                    hashBeforeSign,
                    signature
                },
                taskIndex,
                "Verified",
                operatorSignature,
                {
                    gasLimit: 500000
                }
            );

            console.log('Response transaction sent:', responseTx.hash);
            const responseReceipt = await responseTx.wait();
            console.log('Response receipt:', responseReceipt);

            if (responseReceipt.status === 0) {
                throw new Error('Response transaction failed');
            }

            // Call the callback with transaction data
            if (onTransactionComplete) {
                onTransactionComplete({
                    createTaskHash: tx.hash,
                    responseHash: responseTx.hash
                });
            }

        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
            if (error.data) {
                console.error('Error data:', error.data);
            }
            if (error.transaction) {
                console.error('Transaction:', error.transaction);
            }
        } finally {
            setIsLoading(false);
            setIsGeneratingProof(false);
        }
    };

    return (
        <div className="mt-4">
            <button
                onClick={generateProof}
                disabled={isLoading || !messages.length || !signer}
                className={`px-4 py-2 rounded ${
                    isLoading || !signer
                        ? 'bg-gray-400'
                        : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors`}
            >
                {!signer ? 'Connect Wallet First' : isLoading ? 'Generating...' : 'Generate On-Chain Proof'}
            </button>
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
} 