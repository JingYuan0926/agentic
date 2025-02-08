import React from 'react';
import { Canvas } from '@react-three/fiber';
import Blob from '@/components/Blob';

export default function Home() {
  return (
    <div className="home-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', height: '100vh' }}>
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
    </div>
  );
}
