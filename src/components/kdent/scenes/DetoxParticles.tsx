'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointer, scrollState, phases, rangeLocal, lerp } from '../lib/state';

/**
 * PHASE 2 — DETOX & DE-ANXIETY
 * The camera has passed *through* the porcelain form; it dissolves into
 * a field of calming micro-particles. Scroll slows their velocity —
 * the digital equivalent of a lowering heart rate.
 */
export default function DetoxParticles() {
  const group = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const velocity = useRef(1);

  const COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 900 : 2000;

  const { positions, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const cA = new THREE.Color('#9DBBAF'); // soft sage
    const cB = new THREE.Color('#F0FFD4'); // light mint
    const cC = new THREE.Color('#64748B'); // silver slate
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      seeds[i] = Math.random() * Math.PI * 2;
      const r = Math.random();
      const c = r < 0.5 ? cA : r < 0.82 ? cB : cC;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors, seeds };
  }, [COUNT]);

  const original = useMemo(() => positions.slice(), [positions]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollState.current;
    const local = rangeLocal(p, phases.detox);
    const visible = p > phases.hero.b * 0.6 && p < phases.tour.a + 0.05;
    if (group.current) group.current.visible = visible;
    if (!visible) return;

    // breathing deceleration: velocity falls as the visitor scrolls deeper
    const targetV = lerp(1, 0.18, smoothLocal(local));
    velocity.current = lerp(velocity.current, targetV, 0.05);

    const attr = pointsRef.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (attr) {
      const arr = attr.array as Float32Array;
      const v = velocity.current;
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const s = seeds[i];
        // gentle drift downward + sine sway, scaled by decelerating velocity
        arr[ix + 1] -= 0.0022 * v * (0.6 + Math.sin(s) * 0.4);
        arr[ix] += Math.sin(t * 0.4 + s) * 0.0016 * v;
        // respawn at top when sinking past the floor
        if (arr[ix + 1] < -5) {
          arr[ix + 1] = 5;
          arr[ix] = original[ix];
        }
      }
      attr.needsUpdate = true;
    }

    if (matRef.current) {
      // fade in on entry, dissolve on exit
      const enter = rangeLocal(local, { a: 0, b: 0.2 });
      const exit = 1 - rangeLocal(local, { a: 0.85, b: 1 });
      matRef.current.opacity = 0.85 * Math.min(enter, exit);
      matRef.current.size = 0.05 + Math.sin(t * 0.8) * 0.004 - local * 0.012;
    }

    if (group.current) {
      group.current.rotation.y = lerp(group.current.rotation.y, pointer.nx * 0.08, 0.03);
      // "exhale" — the whole field breathes out slowly
      const breathe = 1 + Math.sin(t * 0.5) * 0.02 * velocity.current;
      group.current.scale.setScalar(breathe);
    }
  });

  return (
    <group ref={group}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          size={0.05}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/** tiny helper to avoid importing smoothstep twice with different names */
function smoothLocal(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
