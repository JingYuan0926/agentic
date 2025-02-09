import { useState } from 'react';
import Head from 'next/head';
import { Textarea } from "@heroui/input";
import { useRouter } from 'next/router';
import { FiSend } from 'react-icons/fi';

export default function AIInterface() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (input.trim() && !isLoading) {
            setIsLoading(true);
            await router.push({
                pathname: '/chat',
                query: { message: input.trim() }
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#E0FFFF] to-[#E0FFFF]" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            <Head>
                <title>4 Human 1 AI</title>
                <link
                    href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <main className="container mx-auto max-w-6xl px-4">
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <div className="text-center space-y-6 w-full">
                        <h1 className="text-6xl font-bold bg-gradient-to-r from-[#823EE4] via-[#99BBFF] to-[#00EF8B] inline-block text-transparent bg-clip-text">
                            4 Human 1 AI
                        </h1>

                        <div className="flex items-center justify-center gap-2 text-gray-600 -mt-2">
                            <span className="font-epilogue text-xl">Built on</span>
                            <div className="flex items-center translate-y-[-1px]">
                                <img
                                    src="/Flow1.svg"
                                    alt="Flow Logo"
                                    className="h-6 w-auto"
                                />
                            </div>
                        </div>

                        <div className="w-full max-w-4xl mx-auto px-4">
                            <div className="rounded-lg p-4">
                                <div className="flex items-end gap-2 relative">
                                    {/* White background div */}
                                    <div 
                                        className="absolute inset-0 bg-white rounded-lg"
                                        style={{
                                            width: 'calc(100% - 52px)', // Subtracting button width + gap
                                            height: '50px'
                                        }}
                                    />
                                    
                                    {/* Textarea on top */}
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Enter your description"
                                        className="w-full rounded-lg shadow-sm overflow-hidden relative z-10"
                                        disableAutosize={true}
                                        variant="bordered"
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
                                        disabled={!input.trim() || isLoading}
                                        className={`p-3 rounded-full relative z-10 mb-1 ${!input.trim()
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