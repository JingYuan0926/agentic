import React from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from '@/components/Blob';
import BlobChat from '@/components/BlobChat';

export default function Home() {
  return (
    <div className="home-container">
      <h1>Welcome to the Home Page</h1>
      <div style={{ height: '100vh', width: '100%' }}>
        <Canvas camera={{ position: [0, 0, 5] }}>
          <Blob />
        </Canvas>
      </div>
    </div>
  );
}
