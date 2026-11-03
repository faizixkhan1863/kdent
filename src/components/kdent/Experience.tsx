'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, AdaptiveDpr, Preload } from '@react-three/drei';
import HeroSmile from './scenes/HeroSmile';
import DetoxParticles from './scenes/DetoxParticles';
import ClinicRoom from './scenes/ClinicRoom';
import ServiceCrystal from './scenes/ServiceCrystal';

/**
 * Fixed, full-viewport WebGL stage. Every scene self-manages visibility
 * from the global scroll progress, so phases crossfade cinematically.
 */
export default function Experience() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.1, 4.6], fov: 42, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          {/* soft studio lighting */}
          <ambientLight intensity={0.55} />
          <directionalLight position={[-4, 5, 4]} intensity={1.1} color="#ffffff" />
          <directionalLight position={[4, -2, 2]} intensity={0.35} color="#DCE8F2" />
          <spotLight position={[0, 6, 3]} angle={0.5} penumbra={1} intensity={0.5} color="#ffffff" />

          {/* offline studio environment for porcelain reflections */}
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={2.2} position={[0, 4, 2]} scale={[8, 3, 1]} color="#ffffff" />
            <Lightformer intensity={1.1} position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[6, 2.5, 1]} color="#F0FFD4" />
            <Lightformer intensity={0.8} position={[5, -1, 0]} rotation-y={-Math.PI / 2} scale={[6, 2.5, 1]} color="#C7D2DE" />
            <Lightformer intensity={0.5} position={[0, -4, 1]} scale={[8, 2, 1]} color="#0F172A" />
          </Environment>

          <HeroSmile />
          <DetoxParticles />
          <ClinicRoom />
          <ServiceCrystal />

          <AdaptiveDpr pixelated={false} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
