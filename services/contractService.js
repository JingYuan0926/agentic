import { ethers } from 'ethers';
import { AVS_CONTRACT_ADDRESS, HOLESKY_RPC, AVS_ABI } from '../utils/contexts';

class ContractService {
    constructor() {
        if (!window.ethereum) {
            throw new Error('MetaMask not found! Please install MetaMask.');
        }
        // Initialize with MetaMask provider for user transactions
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.contract = new ethers.Contract(AVS_CONTRACT_ADDRESS, AVS_ABI, this.provider);
    }

    async verifyOperator() {
        try {
            const isRegistered = await this.contract.operatorRegistered(this.operatorWallet.address);
            if (!isRegistered) {
                console.error('Operator is not registered:', this.operatorWallet.address);
                throw new Error('Operator not registered');
            }
            console.log('Operator verified:', this.operatorWallet.address);
        } catch (error) {
            console.error('Failed to verify operator:', error);
            throw error;
        }
    }

    async ensureHoleskyNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x4268' }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x4268',
                        chainName: 'Holesky',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: [HOLESKY_RPC],
                        blockExplorerUrls: ['https://holesky.etherscan.io']
                    }]
                });
            } else {
                throw switchError;
            }
        }
    }

    async createTask(content) {
        try {
            await this.ensureHoleskyNetwork();
            const signer = await this.provider.getSigner();
            const contractWithSigner = this.contract.connect(signer);

            console.log('Creating task on Holesky...');
            const tx = await contractWithSigner.createNewTask(content);
            console.log('Transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('Receipt:', receipt);

            let taskIndex;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.contract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    
                    if (parsedLog && parsedLog.name === 'NewTaskCreated') {
                        taskIndex = parsedLog.args[0];
                        break;
                    }
                } catch (e) {
                    console.log('Failed to parse log:', e);
                    continue;
                }
            }

            if (taskIndex === undefined) {
                throw new Error('NewTaskCreated event not found in transaction receipt');
            }

            console.log('Task created with index:', taskIndex);

            return {
                hash: tx.hash,
                task: {
                    contents: content,
                    taskCreatedBlock: receipt.blockNumber
                },
                taskIndex: taskIndex
            };
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async createSignature(response, contents) {
        const messageHash = ethers.solidityPackedKeccak256(
            ['string', 'string'],
            [response, contents]
        );
        const messageHashBytes = ethers.getBytes(messageHash);
        const signature = await this.operatorWallet.signMessage(messageHashBytes);
        return signature;
    }

    async respondToTask(task, taskIndex, response) {
        try {
            console.log('Responding to task:', { task, taskIndex, response });

            // Get operator signature and transaction from backend
            const operatorResponse = await fetch('/api/operator-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task: {
                        contents: task.contents,
                        taskCreatedBlock: Number(task.taskCreatedBlock)
                    },
                    taskIndex: Number(taskIndex),
                    response
                })
            });

            if (!operatorResponse.ok) {
                const error = await operatorResponse.json();
                throw new Error(error.message || 'Failed to get operator response');
            }

            const { txHash } = await operatorResponse.json();
            return txHash;
        } catch (error) {
            console.error('Error responding to task:', error);
            throw error;
        }
    }

    async getAIResponse(content) {
        try {
            const response = await fetch('/api/ai-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('AI Response Error:', error);
            throw error;
        }
    }

    listenToNewTasks(callback) {
        this.contract.on('NewTaskCreated', callback);
        return () => this.contract.off('NewTaskCreated', callback);
    }

    listenToResponses(callback) {
        this.contract.on('TaskResponseReceived', callback);
        return () => this.contract.off('TaskResponseReceived', callback);
    }
}

export default ContractService; 