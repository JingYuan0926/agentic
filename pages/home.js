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

        <div style={{ 
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          flex: 1,
          overflowY: 'auto',
          fontSize: '16px'
        }}>
          {chatLog.map((entry, index) => (
            <div key={index} style={{ 
              marginBottom: '12px',
              fontFamily: 'monospace',
              lineHeight: '1.5'
            }}>
              <span style={{ 
                fontWeight: 'bold',
                color: entry.agent === 'ERROR' ? '#ff4444' : 
                       entry.agent === 'DONE' ? '#44ff44' : '#0088ff',
                fontSize: '18px'
              }}>
                [{entry.agent}]:
              </span>{' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>{entry.message}</span>
            </div>
          ))}
        </div>

        <div style={{ 
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe the smart contract you need..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Generate
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
