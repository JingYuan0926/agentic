import React from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from './Blob';

export default function AvatarGrid() {
  const blobs = [
    { shape: 'sphere', position: 'top-left', name: 'Finn the Finder' },
    { shape: 'dna', position: 'top-right', name: 'Cody the Creator' },
    { shape: 'diamond', position: 'bottom-left', name: 'Dex the Developer' },
    { shape: 'torus', position: 'bottom-right', name: 'Vee the Verifier' }
  ];

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
          <div key={index} className="relative w-full h-full p-8 flex flex-col items-center">
            <div className="flex-1 w-full">
              <Canvas 
                camera={{ position: [0, 0, 3.5] }}
                style={{ width: '100%', height: '100%' }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Blob shape={blob.shape} isActive={false} scale={1.2} />
              </Canvas>
            </div>
            <div className="text-center mt-2 text-lg font-semibold text-gray-800">
              {blob.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 