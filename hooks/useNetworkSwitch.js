import { ethers } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers/react';

export function useNetworkSwitch() {
    const { walletProvider } = useWeb3ModalProvider();

    const switchToFlow = async () => {
        try {
            // Switch to Flow EVM
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x221' }], // 545 in hex
            });

            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            return { provider, signer };
        } catch (error) {
            if (error.code === 4902) {
                // Add Flow EVM network if not exists
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x221', // 545 in hex
                        chainName: 'EVM on Flow (testnet)',
                        nativeCurrency: {
                            name: 'Flow Token',
                            symbol: 'FLOW',
                            decimals: 18
                        },
                        rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
                        blockExplorerUrls: ['https://evm-testnet.flowscan.io']
                    }]
                });
                // Try switching again after adding
                return switchToFlow();
            }
            // Silently handle errors
            console.error('Error switching to Flow:', error);
            return { provider: null, signer: null };
        }
    };

    const switchToHolesky = async () => {
        try {
            // Switch to Holesky
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x4268' }], // 17000 in hex (Holesky)
            });

            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            return { provider, signer };
        } catch (error) {
            if (error.code === 4902) {
                // Add Holesky network if not exists
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x4268',
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
                // Try switching again after adding
                return switchToHolesky();
            }
            console.error('Error switching to Holesky:', error);
            throw error;
        }
    };

    return {
        switchToFlow,
        switchToHolesky
    };
} 