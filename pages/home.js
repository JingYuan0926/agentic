import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from '@/components/Blob';


export default function Home() {
  const [inputText, setInputText] = useState('');
  const [agentStates, setAgentStates] = useState({
    analyzer: { active: false, message: '' },
    templater: { active: false, message: '' },
    customizer: { active: false, message: '' },
    validator: { active: false, message: '' }
  });
  const [chatLog, setChatLog] = useState([]);

  const updateAgentState = (agentId, isActive, message) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { active: isActive, message }
    }));
    if (message) {
      setChatLog(prev => [...prev, { agent: agentId, message }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Clear previous chat log
    setChatLog([]);

    // Simulate AI agents workflow
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
      
      setChatLog(prev => [...prev, { agent: 'DONE', message: 'Smart contract code generated ✅' }]);
      setChatLog(prev => [...prev, { agent: 'OUTPUT', message: data.response }]);
      setInputText('');

    } catch (error) {
      console.error('Error:', error);
      setChatLog(prev => [...prev, { agent: 'ERROR', message: 'An error occurred during processing' }]);
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
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="sphere" isActive={agentStates.analyzer.active} />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="dna" isActive={agentStates.templater.active} />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="diamond" isActive={agentStates.customizer.active} />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="torus" isActive={agentStates.validator.active} />
          </Canvas>
        </div>

        <div className="flex-auto overflow-y-auto bg-white rounded-lg shadow p-5 space-y-4">
        {chatLog.map((entry, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded shadow-sm">
            <span className={`font-bold text-${entry.agent === 'ERROR' ? 'red-500' : entry.agent === 'DONE' ? 'green-500' : 'blue-500'} text-lg`}>
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
