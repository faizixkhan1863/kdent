'use client';

/**
 * GemScene — the molten-gold signature object of "The Menu".
 * One gem, six temperaments: geometry and shading morph per treatment,
 * with a scale "pop" on every change, slow rotation, gentle float,
 * pointer parallax and a thin sparkling gold orbit.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';

const POLY_VARIANTS = new Set([0, 1, 3]);
const norm = (n: number) => ((n % 6) + 6) % 6;

/* geometry per treatment — flat-shaded polyhedra vs smooth forms */
function GemGeometry({ variant }: { variant: number }) {
  switch (norm(variant)) {
    case 0:
      return <icosahedronGeometry args={[1.25, 0]} />;
    case 1:
      return <octahedronGeometry args={[1.3, 0]} />;
    case 2:
      return <torusKnotGeometry args={[0.8, 0.26, 160, 24]} />;
    case 3:
      return <dodecahedronGeometry args={[1.25, 0]} />;
    case 4:
      return <capsuleGeometry args={[0.72, 0.9, 8, 20]} />;
    default:
      return <torusGeometry args={[1.0, 0.38, 32, 80]} />;
  }
}

function Gem({ variant }: { variant: number }) {
  const parallax = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const scaleRef = useRef(0.35);

  /* brushed champagne gold */
  const gemMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#e6d2a8',
        metalness: 0.9,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.4,
      }),
    []
  );

  /* ~60 deterministic sparkle motes around the ring */
  const sparkles = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r = 1.9 + ((i * 37) % 100) / 100 * 0.35;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r;
      arr[i * 3 + 2] = (((i * 17) % 100) / 100 - 0.5) * 0.22;
    }
    return arr;
  }, []);

  useEffect(() => {
    scaleRef.current = 0.35; // pop on every treatment change (and on mount)
    gemMat.flatShading = POLY_VARIANTS.has(norm(variant));
    gemMat.needsUpdate = true;
  }, [variant, gemMat]);

  useEffect(() => () => gemMat.dispose(), [gemMat]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);

    // ease the pop back to full size
    scaleRef.current += (1 - scaleRef.current) * d * 6;

    if (spinner.current) {
      spinner.current.scale.setScalar(scaleRef.current);
      spinner.current.rotation.y += d * 0.25;
      spinner.current.rotation.x += d * 0.07;
    }

    if (parallax.current) {
      const g = parallax.current;
      g.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
      g.rotation.x += (state.pointer.y * 0.2 - g.rotation.x) * d * 3;
      g.rotation.y += (-state.pointer.x * 0.15 - g.rotation.y) * d * 3;
    }

    if (orbit.current) orbit.current.rotation.z += d * 0.18;
  });

  return (
    <group ref={parallax}>
      <group ref={spinner}>
        <mesh material={gemMat}>
          <GemGeometry variant={variant} />
        </mesh>
      </group>

      {/* tilted sparkle ring + motes */}
      <group ref={orbit} rotation={[Math.PI / 2.7, 0, 0.3]}>
        <mesh>
          <torusGeometry args={[1.9, 0.006, 12, 120]} />
          <meshStandardMaterial color="#c6a15b" metalness={1} roughness={0.22} envMapIntensity={1.3} />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[sparkles, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#e6d2a8"
            size={0.03}
            sizeAttenuation
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </points>
      </group>
    </group>
  );
}

/* gold + ivory Lightformer studio — no network assets, alpha-safe */
function GemEnvironment() {
  return (
    <Environment resolution={256}>
      <color attach="background" args={['#17130c']} />
      <Lightformer form="rect" intensity={3.2} color="#e6d2a8" scale={[5, 1.2, 1]} position={[0, 4, -4]} />
      <Lightformer form="rect" intensity={2.4} color="#c6a15b" scale={[1, 3.5, 1]} position={[5, 0.5, 2]} />
      <Lightformer form="rect" intensity={1.8} color="#fff7e6" scale={[4, 2.5, 1]} position={[-5, 1.5, -1]} />
      <Lightformer form="circle" intensity={2.6} color="#ffe9c4" scale={2.2} position={[0, 5.5, 0]} />
    </Environment>
  );
}

export default function GemScene({ variant }: { variant: number }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 38, position: [0, 0, 6] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 5, 3]} intensity={1.2} color="#fff2dd" />
        <Gem variant={variant} />
        <GemEnvironment />
      </Canvas>
    </div>
  );
}
