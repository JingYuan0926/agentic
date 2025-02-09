import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from './Blob';

export default function AvatarGrid() {
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentStates, setAgentStates] = useState({
    finder: { active: false, message: '', position: 0 },
    creator: { active: false, message: '', position: 1 },
    developer: { active: false, message: '', position: 2 },
    verifier: { active: false, message: '', position: 3 }
  });

  const blobs = [
    { shape: 'sphere', position: 'top-left', name: 'Finn the Finder', id: 'finder' },
    { shape: 'dna', position: 'top-right', name: 'Cody the Creator', id: 'creator' },
    { shape: 'diamond', position: 'bottom-left', name: 'Dex the Developer', id: 'developer' },
    { shape: 'torus', position: 'bottom-right', name: 'Vee the Verifier', id: 'verifier' }
  ];

  const handleAgentClick = (agentId) => {
    if (activeAgent === agentId) {
      // Deactivate current agent
      setActiveAgent(null);
      setAgentStates(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], active: false }
      }));
    } else {
      // Deactivate previous agent if exists
      if (activeAgent) {
        setAgentStates(prev => ({
          ...prev,
          [activeAgent]: { ...prev[activeAgent], active: false }
        }));
      }
      // Activate new agent
      setActiveAgent(agentId);
      setAgentStates(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], active: true }
      }));
    }
  };

  return (
    <div className="w-1/2 relative flex items-center justify-center bg-white">
      {/* Full screen cross lines */}
      <div className="absolute inset-0">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 w-[2px] h-full bg-black transform -translate-x-1/2"></div>
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black transform -translate-y-1/2"></div>
      </div>

      {/* Grid container */}
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {blobs.map((blob, index) => (
          <div 
            key={index} 
            className={`relative w-full h-full p-8 flex flex-col items-center cursor-pointer
              ${agentStates[blob.id].active ? 'agent-active' : ''}`}
            onClick={() => handleAgentClick(blob.id)}
          >
            <div className={`flex-1 w-full rounded-lg transition-all duration-300
              ${agentStates[blob.id].active ? 'border-4 border-emerald-500 shadow-lg shadow-emerald-200' : 'border-4 border-transparent'}`}>
              <Canvas 
                camera={{ position: [0, 0, 3.5] }}
                style={{ width: '100%', height: '100%' }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Blob 
                  shape={blob.shape} 
                  isActive={agentStates[blob.id].active}
                  scale={1.2} 
                />
              </Canvas>
            </div>
            <div className={`text-center mt-2 text-lg font-semibold transition-colors duration-300
              ${agentStates[blob.id].active ? 'text-emerald-600' : 'text-gray-800'}`}>
              {blob.name}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .agent-active {
          z-index: 10;
        }
      `}</style>
    </div>
  );
} 