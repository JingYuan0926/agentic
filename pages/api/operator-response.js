import { ethers } from 'ethers';
import { AVS_CONTRACT_ADDRESS, HOLESKY_RPC, AVS_ABI } from '../../utils/contexts';

async function createSignature(wallet, response, contents) {
    const messageHash = ethers.solidityPackedKeccak256(
        ['string', 'string'],
        [response, contents]
    );
    const messageHashBytes = ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageHashBytes);
    return signature;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { task, taskIndex, response } = req.body;

        // Initialize operator wallet
        const provider = new ethers.JsonRpcProvider(HOLESKY_RPC);
        const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(AVS_CONTRACT_ADDRESS, AVS_ABI, operatorWallet);

        // Create signature
        const signature = await createSignature(operatorWallet, response, task.contents);

        // Submit with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                const tx = await contract.respondToTask(
                    task,
                    taskIndex,
                    response,
                    signature,
                    {
                        gasLimit: 500000
                    }
                );

                console.log('Transaction sent:', tx.hash);
                const receipt = await tx.wait();
                console.log('Transaction confirmed:', receipt.hash);

                return res.status(200).json({ txHash: receipt.hash });
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                console.log(`Retrying... ${retries} attempts left`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Operator Response Error:', error);
        res.status(500).json({ 
            error: 'Failed to submit operator response',
            message: error.message
        });
    }
} 