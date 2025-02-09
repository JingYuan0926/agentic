import { useState } from 'react';
import Head from 'next/head';
import { Textarea } from "@heroui/input";
import { useRouter } from 'next/router';
import { FiSend } from 'react-icons/fi';
import Header from '../components/Header';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import { useDisclosure } from "@heroui/react";
import ConnectWalletModal from '../components/ConnectWalletModal';

export default function AIInterface() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { isConnected } = useWeb3ModalAccount();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!isConnected) {
            onOpen();
            return;
        }
        if (input.trim() && !isLoading) {
            setIsLoading(true);
            try {
                await router.push({
                    pathname: '/chat',
                    query: { message: input.trim() }
                });
            } catch (error) {
                console.error('Navigation error:', error);
                setIsLoading(false);
            }
        }
    };

    const handlePromptClick = async (promptText) => {
        if (!isConnected) {
            onOpen();
            return;
        }
        try {
            await router.push({
                pathname: '/chat',
                query: { message: promptText }
            });
        } catch (error) {
            console.error('Navigation error:', error);
        }
    };

    return (
        <div className="h-screen overflow-hidden" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            <Head>
                <title>4 Human 1 AI</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <Header />

            <ConnectWalletModal 
                isOpen={isOpen} 
                onOpenChange={onOpenChange}
            />

            <main className="container mx-auto max-w-6xl px-4 h-[calc(100vh-73px)]">
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-center w-full">
                        <div className="space-y-0">
                            <h1 className="text-6xl font-bold bg-gradient-to-r from-[#823EE4] via-[#99BBFF] to-[#00EF8B] inline-block text-transparent bg-clip-text mb-0">
                                4 Human 1 AI
                            </h1>

                            <div className="flex items-center justify-center -mt-1">
                                <span className="font-epilogue text-xl">Built on</span>
                                <div className="flex items-center translate-y-[-1px] ml-2">
                                    <img
                                        src="/Flow1.svg"
                                        alt="Flow Logo"
                                        className="h-6 w-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 mb-6">
                            <p className="text-gray-600 text-lg">
                                Tell the AI what you want or press these example to begin
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                            <div 
                                onClick={() => handlePromptClick("I want to send Flow to my friend")}
                                className={`bg-white p-6 rounded-lg shadow-md transition-shadow ${
                                    isConnected 
                                        ? 'cursor-pointer hover:shadow-lg' 
                                        : 'opacity-75'
                                }`}
                            >
                                <div className="text-2xl mb-3">🪙</div>
                                <p className="text-gray-800">I want to send Flow to my friend</p>
                            </div>
                            <div 
                                onClick={() => handlePromptClick("Generate a counter smart contract")}
                                className={`bg-white p-6 rounded-lg shadow-md transition-shadow ${
                                    isConnected 
                                        ? 'cursor-pointer hover:shadow-lg' 
                                        : 'opacity-75'
                                }`}
                            >
                                <div className="text-2xl mb-3">🧮</div>
                                <p className="text-gray-800">Generate a counter smart contract</p>
                            </div>
                            <div 
                                onClick={() => handlePromptClick("Connect to this smart contract")}
                                className={`bg-white p-6 rounded-lg shadow-md transition-shadow ${
                                    isConnected 
                                        ? 'cursor-pointer hover:shadow-lg' 
                                        : 'opacity-75'
                                }`}
                            >
                                <div className="text-2xl mb-3">📜</div>
                                <p className="text-gray-800">Connect to this smart contract</p>
                            </div>
                        </div>

                        <div className="w-full max-w-4xl mx-auto px-4">
                            <div className="rounded-lg p-4">
                                <div className="flex items-end gap-2 relative">
                                    {/* White background div */}
                                    <div 
                                        className="absolute inset-0 bg-white rounded-xl"
                                        style={{
                                            width: 'calc(100% - 52px)',
                                            height: '49px'
                                        }}
                                    />
                                    
                                    {/* Textarea on top */}
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isConnected ? "Type your message here..." : "Connect Wallet to Start Using Us"}
                                        className={`w-full rounded-lg shadow-sm overflow-hidden relative z-10 ${
                                            !isConnected && 'cursor-not-allowed'
                                        }`}
                                        disableAutosize={true}
                                        variant="bordered"
                                        disabled={!isConnected}
                                        style={{
                                            border: 'none',
                                            padding: '5px 480px 0px 0px',
                                            fontSize: '16px',
                                            resize: 'none',
                                            height: '30px',
                                            lineHeight: '20px',
                                            overflowY: 'hidden',
                                            color: 'black',
                                            background: 'transparent'
                                        }}
                                    />

                                    <button
                                        onClick={handleSubmit}
                                        disabled={!input.trim() || isLoading || !isConnected}
                                        className={`p-3 rounded-full relative z-10 mb-1 ${
                                            !isConnected 
                                                ? 'bg-gray-300 cursor-not-allowed' 
                                                : !input.trim() 
                                                    ? 'bg-gray-300 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                                        } text-white flex-shrink-0`}
                                    >
                                        {isLoading ? (
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                        ) : (
                                            <FiSend size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
} 