import { ethers } from 'ethers';

const abi = [
    'function operatorRegistered(address) external view returns (bool)',
    'function aiPublicKey() external view returns (address)',
    'function createNewTask(bytes32 hashBeforeSign, bytes memory signature) external returns (tuple(bytes32 hashBeforeSign, bytes signature))',
    'function respondToTask(tuple(bytes32 hashBeforeSign, bytes signature) task, uint32 referenceTaskIndex, string response, bytes signature) external',
    'event NewTaskCreated(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task)',
    'event TaskResponded(uint32 indexed taskIndex, tuple(bytes32 hashBeforeSign, bytes signature) task, string response, address operator)'
];

const contractAddress = '0x610c598A1B4BF710a10934EA47E4992a9897fad1';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { taskIndex, hashBeforeSign, signature } = req.body;

        // Convert taskIndex string back to number
        const taskIndexNumber = parseInt(taskIndex, 10);

        // Initialize provider
        const provider = new ethers.JsonRpcProvider(process.env.HOLESKY_RPC_URL);
        
        // Initialize operator wallet with private key from environment
        const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
        
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
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
            taskIndexNumber, // Use the converted number
            "Verified",
            operatorSignature,
            { gasLimit: 500000 }
        );

        const responseReceipt = await responseTx.wait();

        return res.status(200).json({
            success: true,
            transactionHash: responseTx.hash,
            receipt: responseReceipt
        });

    } catch (error) {
        console.error('Operator response error:', error);
        return res.status(500).json({
            error: 'Failed to process operator response',
            message: error.message
        });
    }
} 