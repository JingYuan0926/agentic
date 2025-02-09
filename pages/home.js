'use client'
import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components
const Scene = dynamic(() => import('../components/Scene'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900" />
});

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [agentStates, setAgentStates] = useState({
    analyzer: { active: false, message: '', position: 0 },
    templater: { active: false, message: '', position: 1 },
    customizer: { active: false, message: '', position: 2 },
    validator: { active: false, message: '', position: 3 }
  });
  const [chatLog, setChatLog] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);

  const updateAgentState = async (agentId, isActive, message = '') => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { 
        ...prev[agentId],
        active: isActive, 
        message 
      }
    }));

    if (message) {
      setChatLog(prev => [...prev, { agent: agentId, message }]);
    }
  };

  const processAgent = async (agentId, message, delay) => {
    try {
      updateAgentState(agentId, true, `Processing ${agentId}...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await fetch('/api/ai-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message,
          agent: agentId
        }),
      });

      if (!response.ok) {
        throw new Error(`${agentId} API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      updateAgentState(agentId, false, data.response);
      return data.response;
    } catch (error) {
      console.error(`Error in ${agentId}:`, error);
      updateAgentState(agentId, false, `Error: ${error.message}`);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setChatLog([]); // Clear previous chat log

    try {
      // Process each agent sequentially
      const analyzerResult = await processAgent('analyzer', inputText, 1500);
      const templaterResult = await processAgent('templater', analyzerResult, 2000);
      const customizerResult = await processAgent('customizer', templaterResult, 2500);
      const validatorResult = await processAgent('validator', customizerResult, 1500);

      // Final output
      setChatLog(prev => [
        ...prev,
        { agent: 'DONE', message: 'Smart contract code generated ✅' },
        { 
          agent: 'OUTPUT', 
          message: `Analysis:\n${analyzerResult}\n\nTemplate:\n${templaterResult}\n\nCustomization:\n${customizerResult}\n\nValidation:\n${validatorResult}` 
        }
      ]);

      setInputText('');
      
    } catch (error) {
      console.error('Error in processing chain:', error);
      setChatLog(prev => [...prev, { 
        agent: 'ERROR', 
        message: 'An error occurred in the processing chain: ' + error.message 
      }]);
    } finally {
      // Reset all agent states
      Object.keys(agentStates).forEach(agentId => {
        updateAgentState(agentId, false);
      });
    }
  };

  return (
    <div className="home-container">
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        gap: '20px',
        padding: '20px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          height: '60vh',
          gap: '20px',
          minHeight: '300px'
        }}>
          <Suspense fallback={<div className="w-full h-full bg-gray-900" />}>
            <Scene agentStates={agentStates} />
          </Suspense>
        </div>

        <div className="flex-auto overflow-y-auto bg-white rounded-lg shadow p-5 space-y-4">
          {chatLog.map((entry, index) => (
            <div key={index} className="bg-gray-100 p-3 rounded shadow-sm">
              <span className={`font-bold ${
                entry.agent === 'ERROR' ? 'text-red-500' : 
                entry.agent === 'DONE' ? 'text-green-500' : 
                'text-blue-500'
              } text-lg`}>
                [{entry.agent}]:
              </span>{' '}
              <span className="whitespace-pre-wrap">{entry.message}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe the smart contract you need..."
              className="flex-1 p-3 border border-gray-300 rounded"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
            >
              Generate
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}