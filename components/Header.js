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
        <nav className="w-full flex justify-between items-center p-4 border-b bg-[#3674B5] dark:bg-[#3674B5]">
            <div className="font-bold text-xl text-white dark:text-white">
                AI Chatbot
            </div>

            <div className="flex items-center gap-4">
                {isConnected ? (
                    <>
                        <button 
                            className="px-4 py-2 rounded-lg border border-purple-700 hover:bg-purple-800 dark:border-purple-700 dark:hover:bg-purple-800 text-white"
                            onClick={() => open({ view: 'Account' })}
                        >
                            {formatAddress(address)}
                        </button>
                        <div className="text-sm text-gray-200 dark:text-gray-300">
                            {Number(balance).toFixed(4)} ETH
                        </div>
                    </>
                ) : (
                    <w3m-button balance="show" />
                )}
            </div>
        </nav>
    );
}

export default Header 