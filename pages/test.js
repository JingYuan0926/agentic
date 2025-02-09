'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';

export default function Test() {
    const [mounted, setMounted] = useState(false);
    const { address, isConnected } = useWeb3ModalAccount();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header />
            
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
                        Wallet Connection Test
                    </h1>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
                            Connection Status
                        </h2>
                        
                        {isConnected ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-green-700 dark:text-green-400">
                                        ✅ Wallet Connected
                                    </p>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Your Wallet Address:</span>
                                    </p>
                                    <p className="mt-2 font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                                        {address}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <p className="text-yellow-700 dark:text-yellow-400">
                                    ⚠️ Please connect your wallet using the button in the header
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
} 