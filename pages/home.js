import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from '@/components/Blob';

export default function Home() {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle the input text here
    console.log(inputText);
    setInputText('');
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
          flex: 1,
          gap: '20px'
        }}>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="sphere" />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="dna" />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="diamond" />
          </Canvas>
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Blob shape="torus" />
          </Canvas>
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
              placeholder="Type your message..."
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
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
