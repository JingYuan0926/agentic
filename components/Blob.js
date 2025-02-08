import React, { useMemo, useRef } from "react";
import vertexShader from "./vertexShader";
import fragmentShader from "./fragmentShader";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";

const Blob = ({ shape = 'sphere' }) => {
  const mesh = useRef();
  const hover = useRef(false);
  const uniforms = useMemo(() => {
    return {
      u_time: { value: 0 },
      u_intensity: { value: 0.3 },
      u_shape: { value: getShapeValue(shape) },
    };
  }, [shape]);

  function getShapeValue(shape) {
    switch(shape) {
      case 'sphere': return 0;
      case 'dna': return 1;
      case 'diamond': return 2;
      case 'torus': return 3;
      default: return 0;
    }
  }

  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      mesh.current.material.uniforms.u_time.value =
        0.4 * clock.getElapsedTime();

      mesh.current.material.uniforms.u_intensity.value = MathUtils.lerp(
        mesh.current.material.uniforms.u_intensity.value,
        hover.current ? 1 : 0.15,
        0.02
      );
    }
  });

  const getGeometry = () => {
    switch(shape) {
      case 'sphere':
        return <sphereGeometry args={[1, 32, 32]} />;
      case 'dna':
        return <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />;
      case 'diamond':
        return <octahedronGeometry args={[1, 0]} />;
      case 'torus':
        return <torusGeometry args={[0.8, 0.3, 16, 100]} />;
      default:
        return <sphereGeometry args={[1, 32, 32]} />;
    }
  };

  return (
    <mesh
      ref={mesh}
      scale={0.8}
      position={[0, 0, 0]}
      onPointerOver={() => (hover.current = true)}
      onPointerOut={() => (hover.current = false)}
    >
      {getGeometry()}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export default Blob;