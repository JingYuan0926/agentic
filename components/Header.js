'use client';
import { useState, useEffect } from 'react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { formatEther } from 'ethers';

function Header() {
    const [mounted, setMounted] = useState(false);
    const [balance, setBalance] = useState('0');
    const { address, isConnected } = useWeb3ModalAccount();
    const { walletProvider } = useWeb3ModalProvider();
    const { open } = useWeb3Modal();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Send address to API when connected
    useEffect(() => {
        const updateWalletAddress = async () => {
            if (isConnected && address) {
                try {
                    console.log('Sending address to API:', address);
                    const response = await fetch('/api/address', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ address })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update wallet address');
                    }

                    const data = await response.json();
                    console.log('Wallet address updated:', data.message);
                } catch (error) {
                    console.error('Error updating wallet address:', error);
                }
            }
        };

        updateWalletAddress();
    }, [isConnected, address]);

    // Get balance when connected
    useEffect(() => {
        const getBalance = async () => {
            if (isConnected && walletProvider) {
                try {
                    const balance = await walletProvider.request({
                        method: 'eth_getBalance',
                        params: [address, 'latest']
                    });
                    setBalance(formatEther(balance));
                } catch (error) {
                    console.error('Error fetching balance:', error);
                }
            }
        };

        getBalance();
    }, [isConnected, address, walletProvider]);

    const formatAddress = (address) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    if (!mounted) return null;

    return (
        <nav className="w-full flex justify-between items-center p-4 border-b bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 dark:border-gray-700">
            <div className="h-8 relative p-0">
                <img
                    src="/logo.png"
                    alt="AI Chat Logo"
                    className="h-auto w-[250px] mt-[-47px] ml-[-20px]"
                />
            </div>

            <div className="flex items-center gap-4">
                {isConnected ? (
                    <>
                        <button 
                            className="px-4 py-2 rounded-lg border border-[#823EE4] text-[#823EE4] hover:bg-[#E0CCFF]/20 transition-colors"
                            onClick={() => open({ view: 'Account' })}
                        >
                            {formatAddress(address)}
                        </button>
                        <div className="text-sm text-[#823EE4] font-medium">
                            {Number(balance).toFixed(4)} FLOW
                        </div>
                    </>
                ) : (
                    <button 
                        onClick={() => open()}
                        className="px-4 py-2 bg-gradient-to-r from-[#823EE4] to-[#37DDDF] text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#823EE4]"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Header; 