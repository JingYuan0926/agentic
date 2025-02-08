import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from '@/components/Blob';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Home.module.css';  // Adjust the path if needed

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [agentStates, setAgentStates] = useState({
    analyzer: { active: false, message: '' },
    templater: { active: false, message: '' },
    customizer: { active: false, message: '' },
    validator: { active: false, message: '' }
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [showOutput, setShowOutput] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);

  const updateAgentState = (agentId, isActive, message) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { active: isActive, message }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newConversation = {
      id: Date.now(),
      input: inputText,
      outputs: [],
      timestamp: new Date().toLocaleString()
    };

    setShowOutput(false);

    try {
      // Analyzer (AI1) - Intent Analysis
      updateAgentState('analyzer', true, 'Analyzing user intent...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateAgentState('analyzer', false, '');

      // Templater (AI2) - Template Check
      updateAgentState('templater', true, 'Checking for existing templates...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateAgentState('templater', false, '');

      // Customizer (AI3) - Contract Customization
      updateAgentState('customizer', true, 'Customizing contract based on user needs...');
      await new Promise(resolve => setTimeout(resolve, 2500));
      updateAgentState('customizer', false, '');

      // Validator (AI4) - Security Check
      updateAgentState('validator', true, 'Verifying security and gas efficiency...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateAgentState('validator', false, '');

      // Final API call
      const response = await fetch('/api/gpt4o', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputText }),
      });
      const data = await response.json();
      
      newConversation.outputs = [
        { agent: 'DONE', message: 'Smart contract code generated ✅' },
        { agent: 'OUTPUT', message: data.response }
      ];

      setChatHistory(prev => [newConversation, ...prev]);
      setShowOutput(true);
      setIsOutputExpanded(true);
      setInputText('');

    } catch (error) {
      console.error('Error:', error);
      newConversation.outputs = [
        { agent: 'ERROR', message: 'An error occurred during processing' }
      ];
      setChatHistory(prev => [newConversation, ...prev]);
      setShowOutput(true);
    }
  };

  return (
    <div className="home-container">
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px',
          minHeight: '250px',
          height: '50vh',
          transition: 'transform 0.5s ease-in-out',
          transform: showOutput ? 'translateY(-20vh)' : 'translateY(0)',
          marginBottom: showOutput ? '0' : '20px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ position: 'relative', height: '100%' }}>
            {agentStates.analyzer.message && (
              <div className={styles.messageContainer}>
                <div className={styles.dialogBox}>
                  <span className={styles.agentName}>Analyzer</span>
                  <span className={styles.messageText}>
                    {agentStates.analyzer.message}
                  </span>
                </div>
              </div>
            )}
            <Canvas camera={{ position: [0, 0, 5.5] }}>
              <Blob shape="sphere" isActive={agentStates.analyzer.active} />
            </Canvas>
          </div>

          <div style={{ position: 'relative', height: '100%' }}>
            {agentStates.templater.message && (
              <div className={styles.messageContainer}>
                <div className={styles.dialogBox}>
                  <span className={styles.agentName}>Templater</span>
                  <span className={styles.messageText}>
                    {agentStates.templater.message}
                  </span>
                </div>
              </div>
            )}
            <Canvas camera={{ position: [0, 0, 5.5] }}>
              <Blob shape="dna" isActive={agentStates.templater.active} />
            </Canvas>
          </div>

          <div style={{ position: 'relative', height: '100%' }}>
            {agentStates.customizer.message && (
              <div className={styles.messageContainer}>
                <div className={styles.dialogBox}>
                  <span className={styles.agentName}>Customizer</span>
                  <span className={styles.messageText}>
                    {agentStates.customizer.message}
                  </span>
                </div>
              </div>
            )}
            <Canvas camera={{ position: [0, 0, 5.5] }}>
              <Blob shape="diamond" isActive={agentStates.customizer.active} />
            </Canvas>
          </div>

          <div style={{ position: 'relative', height: '100%' }}>
            {agentStates.validator.message && (
              <div className={styles.messageContainer}>
                <div className={styles.dialogBox}>
                  <span className={styles.agentName}>Validator</span>
                  <span className={styles.messageText}>
                    {agentStates.validator.message}
                  </span>
                </div>
              </div>
            )}
            <Canvas camera={{ position: [0, 0, 5.5] }}>
              <Blob shape="torus" isActive={agentStates.validator.active} />
            </Canvas>
          </div>
        </div>

        <div 
          style={{
            position: showOutput ? 'relative' : 'absolute',
            transition: 'all 0.5s ease-in-out',
            height: showOutput ? 'calc(100vh - 300px)' : '0',
            opacity: showOutput ? 1 : 0,
            overflow: 'auto',
            marginBottom: '100px',
            width: '90%',
            maxWidth: '1400px',
            margin: '0 auto',
            marginTop: '-300px'
          }}
        >
          <AnimatePresence>
            {showOutput && chatHistory.map((conversation) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full"
                style={{ 
                  transform: 'translateY(-40px)'
                }}
              >
                <motion.div 
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                  style={{ 
                    minHeight: '300px',
                    padding: '24px'
                  }}
                >
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Smart Contract Output
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conversation.timestamp}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 italic">
                      Query: {conversation.input}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {conversation.outputs.map((output, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className={`p-4 rounded-lg ${
                          output.agent === 'ERROR' ? 'bg-red-50 border border-red-200' :
                          output.agent === 'DONE' ? 'bg-green-50 border border-green-200' :
                          'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className={`font-bold mb-2 ${
                          output.agent === 'ERROR' ? 'text-red-600' :
                          output.agent === 'DONE' ? 'text-green-600' :
                          'text-blue-600'
                        }`}>
                          {output.agent}
                        </div>
                        <div className="text-gray-700 font-mono text-sm whitespace-pre-wrap">
                          {output.message}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-lg">
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe the smart contract you need..."
                className="flex-1 p-4 rounded-xl border border-gray-300 
                          shadow-inner bg-white/90 
                          text-gray-800 placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent transition-all duration-200
                          text-lg"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-blue-500 text-white rounded-xl
                         font-semibold hover:bg-blue-600 
                         transform hover:scale-105
                         shadow-lg hover:shadow-xl
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <span>Generate</span>
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
