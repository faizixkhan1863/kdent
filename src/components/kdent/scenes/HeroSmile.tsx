'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { pointer, scrollState, phases, rangeLocal, smoothstep, lerp } from '../lib/state';

/**
 * PHASE 1 — THE HERO
 * A dark sapphire void gives birth to a pristine porcelain form that
 * morphs from an organic fluid blob into a glossy abstract smile.
 * The user's mouse acts as a localized light source.
 */
export default function HeroSmile() {
  const group = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Group>(null);
  const smileMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const blobMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const mouseLight = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scrollState.current;
    const local = rangeLocal(p, phases.hero);
    const visible = p < phases.hero.b + 0.06;
    if (group.current) group.current.visible = visible;
    if (!visible) return;

    // morph: 0 → blob, 1 → smile
    const morph = smoothstep(rangeLocal(local, { a: 0.18, b: 0.75 }));
    // exit: the camera plunges *through* the form — it shrinks & dissolves
    const exitK = 1 - smoothstep(rangeLocal(local, { a: 0.78, b: 0.99 }));

    // pointer parallax + idle motion
    pointer.sx = lerp(pointer.sx, pointer.nx, 0.06);
    pointer.sy = lerp(pointer.sy, pointer.ny, 0.06);
    const isMobile = window.innerWidth < 768;
    // desktop: hovering moon above the title · mobile: corner accent orb
    const baseY = isMobile ? 1.02 : 0.68;
    const baseX2 = isMobile ? 0.72 : 0;
    if (group.current) {
      group.current.rotation.y = lerp(group.current.rotation.y, pointer.sx * 0.35 + t * 0.08, 0.08);
      group.current.rotation.x = lerp(group.current.rotation.x, -pointer.sy * 0.22, 0.08);
      group.current.position.y = baseY + Math.sin(t * 0.6) * 0.08 - morph * 0.1;
      group.current.position.x = lerp(group.current.position.x, baseX2, 0.06);
    }

    // blob shrinks & dissolves
    if (blob.current) {
      const s = (1 - morph) * exitK * (1 + Math.sin(t * 0.8) * 0.02);
      blob.current.scale.setScalar(Math.max(0.001, s));
      blob.current.rotation.z = t * 0.15;
      if (blobMat.current) {
        blobMat.current.opacity = (1 - morph * morph) * exitK;
        blobMat.current.transparent = true;
      }
    }

    // smile crescent grows in, then dissolves as we pass through it
    if (smile.current) {
      const s = (0.35 + morph * 0.75) * Math.max(0.001, exitK);
      smile.current.scale.setScalar(s);
      smile.current.rotation.z = lerp(0.9, 0, morph) + Math.sin(t * 0.5) * 0.03;
      smile.current.position.y = lerp(-0.4, 0, morph);
    }
    if (smileMat.current) {
      smileMat.current.opacity =
        smoothstep(rangeLocal(morph, { a: 0.35, b: 0.9 })) * exitK;
      smileMat.current.transparent = true;
    }

    // camera slow dolly + drift — plunging forward through the form
    const cam = state.camera;
    const targetZ = lerp(4.6, 2.4, smoothstep(local));
    cam.position.z = lerp(cam.position.z, targetZ, 0.05);
    cam.position.x = lerp(cam.position.x, pointer.sx * 0.25, 0.05);
    cam.position.y = lerp(cam.position.y, 0.1 + pointer.sy * 0.15, 0.05);
    cam.lookAt(0, 0, 0);

    // mouse light source (localized glow that tracks the cursor)
    if (mouseLight.current) {
      const lx = pointer.sx * viewport.width * 0.5;
      const ly = pointer.sy * viewport.height * 0.5;
      mouseLight.current.position.set(lx, ly, 1.6);
      mouseLight.current.intensity = 26 + Math.sin(t * 2.2) * 3;
    }
  });

  const w = typeof window !== 'undefined' && window.innerWidth < 768 ? 0.34 : 0.55;

  return (
    <group ref={group} scale={w}>
      {/* the visitor's mouse as a localized light source */}
      <pointLight ref={mouseLight} intensity={26} distance={7} decay={2} color="#F0FFD4" />

      {/* organic fluid blob */}
      <mesh ref={blob}>
        <icosahedronGeometry args={[1.32, 48]} />
        <MeshDistortMaterial
          ref={blobMat as never}
          color="#E9EEF4"
          roughness={0.14}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.08}
          distort={0.42}
          speed={1.6}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* porcelain smile crescent */}
      <group ref={smile}>
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[1.15, 0.34, 48, 96, Math.PI * 0.62]} />
          <meshPhysicalMaterial
            ref={smileMat}
            color="#ffffff"
            roughness={0.08}
            metalness={0.04}
            clearcoat={1}
            clearcoatRoughness={0.05}
            reflectivity={0.7}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* glinting highlight bead */}
        <Float speed={2.4} floatIntensity={0.6} rotationIntensity={0.4}>
          <mesh position={[0.95, 0.5, 0.4]}>
            <icosahedronGeometry args={[0.09, 3]} />
            <meshPhysicalMaterial
              color="#F0FFD4"
              roughness={0.05}
              metalness={0.2}
              clearcoat={1}
              emissive="#F0FFD4"
              emissiveIntensity={0.35}
            />
          </mesh>
        </Float>
      </group>
    </group>
  );
}
