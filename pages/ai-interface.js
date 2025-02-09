import { useState } from 'react';
import Head from 'next/head';
import { Textarea } from "@heroui/react";

export default function AIInterface() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0FFFF] to-[#E0FFFF]" style={{fontFamily: 'Epilogue, sans-serif'}}>
      <Head>
        <title>4 Human 1 AI</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
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

            <div className="w-full max-w-4xl mx-auto relative -mt-2">
              <Textarea
                variant="flat"
                placeholder="Enter your description"
                className="w-full bg-[#f5f5f5] text-gray-700 rounded-lg shadow-sm overflow-hidden"
                disableAutosize={true}
                style={{
                  border: 'none',
                  padding: '5px 480px 0px 0px',
                  fontSize: '16px',
                  resize: 'none',
                  height: '30px',
                  lineHeight: '20px',
                  overflowY: 'hidden',
                  color: '#000000'
                }}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Send message"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="text-[#3334F8] hover:text-[#823EE4] transition-colors"
                >
                  <path 
                    d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" 
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 