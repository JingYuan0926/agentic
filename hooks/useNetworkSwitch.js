import { ethers } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers/react';

export function useNetworkSwitch() {
    const { walletProvider } = useWeb3ModalProvider();

    const switchToSepolia = async () => {
        try {
            // Switch to Sepolia
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // 11155111 in hex (Sepolia)
            });

            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            return { provider, signer };
        } catch (error) {
            console.error('Error switching to Sepolia:', error);
            throw error;
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
            console.error('Error switching to Holesky:', error);
            throw error;
        }
    };

    return {
        switchToSepolia,
        switchToHolesky
    };
} 