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
        <nav className="w-full flex justify-between items-center p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
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
                            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => open({ view: 'Account' })}
                        >
                            {formatAddress(address)}
                        </button>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {Number(balance).toFixed(4)} ETH
                        </div>
                    </>
                ) : (
                    <button 
                        onClick={() => open()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Header; 