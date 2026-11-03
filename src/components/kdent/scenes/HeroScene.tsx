'use client';

/**
 * HeroScene — the K Dent atelier centrepiece.
 *
 * A luminous porcelain sculpture beneath two precessing gold halo rings,
 * a pearl satellite on a tilted orbit and a rising field of gold dust.
 * Lit entirely by warm Lightformers (no network HDRI) plus a
 * cursor-trailing champagne light. 100% procedural — zero external assets.
 */

import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshDistortMaterial,
} from '@react-three/drei';

/* ------------------------------------------------------------------ */
/*  Porcelain sculpture — slow self-rotation + gentle float            */
/* ------------------------------------------------------------------ */
function Sculpture() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.y += delta * 0.12;
    mesh.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 32]} />
      <MeshDistortMaterial
        distort={0.38}
        speed={1.5}
        color="#f3eee4"
        roughness={0.16}
        metalness={0.08}
        clearcoat={1}
        clearcoatRoughness={0.14}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Gold halo rings — very slow counter-rotations (gyroscopic sweep).  */
/*  Kept as precession about Y: a symmetric torus spinning about its   */
/*  own local Z is a geometric no-op (nothing would visibly move).     */
/* ------------------------------------------------------------------ */
function HaloRings() {
  const innerRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (innerRef.current) innerRef.current.rotation.y += delta * 0.07;
    if (outerRef.current) outerRef.current.rotation.y -= delta * 0.05;
  });

  return (
    <>
      <group ref={innerRef}>
        <mesh rotation={[1.15, 0.25, 0]}>
          <torusGeometry args={[2.35, 0.014, 16, 220]} />
          <meshStandardMaterial metalness={1} roughness={0.22} color="#c6a15b" />
        </mesh>
      </group>
      <group ref={outerRef}>
        <mesh rotation={[1.35, -0.4, 0.2]}>
          <torusGeometry args={[2.95, 0.008, 16, 220]} />
          <meshStandardMaterial
            metalness={1}
            roughness={0.28}
            color="#8f6f35"
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Pearl — porcelain satellite on a tilted circular orbit             */
/* ------------------------------------------------------------------ */
function Pearl() {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(0);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    angleRef.current += delta * 0.18;
    const a = angleRef.current;
    mesh.position.set(Math.cos(a) * 2.35, Math.sin(a * 2) * 0.3, Math.sin(a) * 2.35);
  });

  return (
    <group rotation={[0.3, 0, 0.15]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 48, 48]} />
        <meshPhysicalMaterial
          color="#f3eee4"
          roughness={0.16}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.14}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Gold dust — slow upward drift, wrapping at the ceiling             */
/* ------------------------------------------------------------------ */
function GoldDust({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 11; // x — 11 wide
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7; // y — 7 tall
      positions[i * 3 + 2] = -2 + Math.random() * 5; // z — -2 … 3
      speeds[i] = 0.06 + Math.random() * 0.16;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const attribute = points.geometry.getAttribute('position');
    if (!(attribute instanceof THREE.BufferAttribute)) return;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      array[i * 3 + 1] += speeds[i] * delta;
      if (array[i * 3 + 1] > 3.5) array[i * 3 + 1] = -3.5; // wrap at top
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#e6d2a8"
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Cursor-trailing champagne light                                    */
/* ------------------------------------------------------------------ */
function PointerLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const targetRef = useMemo(() => new THREE.Vector3(0, 0, 2.5), []);

  useFrame((state, delta) => {
    const light = lightRef.current;
    if (!light) return;
    targetRef.set(state.pointer.x * 4, state.pointer.y * 2.5, 2.5);
    light.position.lerp(targetRef, 1 - Math.exp(-4 * delta));
  });

  return <pointLight ref={lightRef} intensity={14} color="#e6d2a8" distance={12} />;
}

/* ------------------------------------------------------------------ */
/*  Stage — responsive scale (mobile-first) + eased pointer parallax.  */
/*  ContactShadows live here too: they scale with the stage but stay   */
/*  level (never tilt with the parallax rotation).                     */
/* ------------------------------------------------------------------ */
function Stage({ children }: { children: ReactNode }) {
  const parallaxRef = useRef<THREE.Group>(null);
  const viewport = useThree((state) => state.viewport);
  const scale = Math.min(1, Math.max(0.62, viewport.width / 6.5));

  useFrame((state, delta) => {
    const group = parallaxRef.current;
    if (!group) return;
    const ease = 1 - Math.exp(-3 * delta); // ≈ 0.05 per frame @ 60fps
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, state.pointer.x * 0.22, ease);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -state.pointer.y * 0.12, ease);
  });

  return (
    <group scale={scale}>
      <group ref={parallaxRef}>{children}</group>
      <ContactShadows
        position={[0, -1.95, 0]}
        opacity={0.5}
        scale={11}
        blur={2.6}
        far={4}
        resolution={256}
        color="#000000"
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export default function HeroScene() {
  const dustCount = useMemo(() => {
    if (typeof window === 'undefined') return 260;
    return window.innerWidth < 768 ? 120 : 260;
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 38, position: [0, 0, 6] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#0a0908', 9, 18]} />

        <ambientLight intensity={0.3} />
        <pointLight position={[4, 3, 6]} intensity={30} color="#fff2dd" />
        <PointerLight />

        <Stage>
          <Sculpture />
          <HaloRings />
          <Pearl />
          <GoldDust count={dustCount} />
        </Stage>

        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#070604']} />
          {/* big warm-white form — camera right */}
          <Lightformer
            form="rect"
            intensity={2.4}
            color="#fff2dd"
            position={[6, 1.5, 2]}
            scale={[7, 9, 1]}
          />
          {/* gold strip — camera left */}
          <Lightformer
            form="rect"
            intensity={4.2}
            color="#c6a15b"
            position={[-6, 0, 1]}
            scale={[9, 1.4, 1]}
          />
          {/* faint top strip */}
          <Lightformer
            form="rect"
            intensity={1.1}
            color="#e6d2a8"
            position={[0, 6, 1]}
            scale={[8, 1.6, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}
