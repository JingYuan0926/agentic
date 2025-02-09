import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from './Blob';

export default function AvatarGrid({ activeAgent, aiDialogs }) {
  const [agentStates, setAgentStates] = useState({
    finder: { active: false, message: '', position: 0, voice: null },
    creator: { active: false, message: '', position: 1, voice: null },
    developer: { active: false, message: '', position: 2, voice: null },
    verifier: { active: false, message: '', position: 3, voice: null }
  });

  const [voices, setVoices] = useState([]);

  // Map agent names from chat.js to grid IDs
  const agentNameToId = {
    'Finn': 'finder',
    'Codey': 'creator',
    'Dex': 'developer',
    'Vee': 'verifier'
  };

  // Initialize voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        
        // Assign voices to agents
        setAgentStates(prev => ({
          finder: { ...prev.finder, voice: availableVoices[0] },
          creator: { ...prev.creator, voice: availableVoices[1] },
          developer: { ...prev.developer, voice: availableVoices[2] },
          verifier: { ...prev.verifier, voice: availableVoices[3] }
        }));
      }
    };

    // Load voices immediately
    loadVoices();

    // Also listen for voices to be loaded
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Function to speak text
  const speak = (text, agentVoice) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if available
    if (agentVoice) {
      utterance.voice = agentVoice;
    }
    
    // Configure speech parameters
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Speak the text
    window.speechSynthesis.speak(utterance);

    // Log for debugging
    console.log('Speaking:', text, 'with voice:', agentVoice?.name);
  };

  useEffect(() => {
    if (activeAgent) {
      const resetStates = Object.keys(agentStates).reduce((acc, key) => ({
        ...acc,
        [key]: { ...agentStates[key], active: false }
      }), {});

      const agentId = agentNameToId[activeAgent] || activeAgent.toLowerCase();
      
      setAgentStates({
        ...resetStates,
        [agentId]: { 
          ...agentStates[agentId], 
          active: true 
        }
      });
    }
  }, [activeAgent]);

  useEffect(() => {
    if (aiDialogs && voices.length > 0) {
      Object.entries(aiDialogs).forEach(([agent, message]) => {
        if (message && message !== '') {
          const agentId = agentNameToId[agent] || agent.toLowerCase();
          if (agentStates[agentId] && agentStates[agentId].voice) {
            speak(message, agentStates[agentId].voice);
          }
        }
      });
    }
  }, [aiDialogs, voices]);

  const blobs = [
    { shape: 'sphere', position: 'top-left', name: 'Finn the Finder', id: 'finder' },
    { shape: 'dna', position: 'top-right', name: 'Codey the Creator', id: 'creator' },
    { shape: 'diamond', position: 'bottom-left', name: 'Dex the Developer', id: 'developer' },
    { shape: 'torus', position: 'bottom-right', name: 'Vee the Verifier', id: 'verifier' }
  ];

  return (
    <div className="w-1/2 h-full relative flex items-center justify-center bg-white border-r">
      {/* Full screen cross lines */}
      <div className="absolute inset-0">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 w-[1px] h-full bg-gray-200 transform -translate-x-1/2"></div>
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-200 transform -translate-y-1/2"></div>
      </div>

      {/* Grid container */}
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {blobs.map((blob, index) => (
          <div 
            key={index} 
            className={`relative w-full h-full p-8 flex flex-col items-center
              ${agentStates[blob.id].active ? 'agent-active' : ''}`}
          >
            {agentStates[blob.id].message && (
              <div className={`absolute top-4 left-4 right-4 p-2 rounded-lg bg-gray-100 
                text-sm transition-all duration-300 z-20
                ${agentStates[blob.id].active ? 'opacity-100' : 'opacity-0'}`}>
                {agentStates[blob.id].message}
              </div>
            )}
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