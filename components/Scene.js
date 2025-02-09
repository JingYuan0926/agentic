'use client'
import { Canvas } from '@react-three/fiber';
import Blob from './Blob';

export default function Scene({ agentStates }) {
  return (
    <>
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
    </>
  );
} 