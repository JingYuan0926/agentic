import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Blob = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      wireframe: true,
      emissive: 0x0000ff,
      emissiveIntensity: 0.5,
    });

    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    camera.position.z = 15;

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const position = blob.geometry.attributes.position;
      const vertex = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const offset = geometry.parameters.radius;
        vertex.normalize().multiplyScalar(offset + 0.3 * Math.sin(time + i));
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      position.needsUpdate = true;
      material.emissive.setHSL((time / 10) % 1, 0.5, 0.5);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default Blob;
