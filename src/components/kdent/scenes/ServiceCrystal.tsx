'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { pointer, scrollState, phases, rangeLocal, smoothstep, lerp } from '../lib/state';
import { useKUI } from '../lib/store';

/**
 * PHASE 4 — AESTHETIC MORPH SHOWCASE
 * A floating crystal matrix that morphs its geometry and material to
 * mirror the currently selected K Dent service — raw crystal resolving
 * into flawlessly polished, aligned structures.
 */
export default function ServiceCrystal() {
  const group = useRef<THREE.Group>(null);
  const shapes = useRef<(THREE.Object3D | null)[]>([]);
  const { viewport } = useThree();
  const activeService = useKUI((s) => s.activeService);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const baseX = isMobile ? 0 : -viewport.width * 0.19;
  const baseScale = isMobile ? 0.5 : 0.78;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scrollState.current;
    const local = rangeLocal(p, phases.services);
    const visible = p > phases.tour.b * 0.8 && p < phases.transform.a + 0.04;
    if (group.current) group.current.visible = visible;
    if (!visible || dt === 0) return;

    pointer.sx = lerp(pointer.sx, pointer.nx, 0.06);
    pointer.sy = lerp(pointer.sy, pointer.ny, 0.06);

    if (group.current) {
      group.current.position.x = lerp(group.current.position.x, baseX + pointer.sx * 0.15, 0.06);
      group.current.position.y = Math.sin(t * 0.55) * 0.1 + pointer.sy * 0.1;
      group.current.rotation.y += dt * 0.2;
    }

    // enter / exit scale for the whole showcase
    const enter = smoothstep(rangeLocal(local, { a: 0, b: 0.12 }));
    const exit = 1 - smoothstep(rangeLocal(local, { a: 0.92, b: 1 }));
    group.current?.scale.setScalar(Math.max(0.001, baseScale * enter * exit));

    // own the camera during this phase — pull back for the showcase
    const cam = state.camera;
    cam.position.z = lerp(cam.position.z, 5.2, 0.045);
    cam.position.y = lerp(cam.position.y, 0, 0.05);
    cam.lookAt(0, 0, 0);

    // morph: the active shape grows in, the rest dissolve away
    shapes.current.forEach((obj, i) => {
      if (!obj) return;
      const isActive = i === activeService;
      const cur = obj.scale.x;
      const next = lerp(cur, isActive ? 1 : 0.0001, isActive ? 0.085 : 0.13);
      obj.scale.setScalar(Math.max(0.0001, next));
      obj.visible = next > 0.02;
      obj.traverse((child) => {
        const mat = (child as THREE.Mesh).material as
          | (THREE.MeshPhysicalMaterial & { opacity: number })
          | undefined;
        if (mat && 'opacity' in mat) {
          mat.transparent = true;
          mat.opacity = Math.min(1, next * 1.2);
        }
      });
      if (isActive) obj.rotation.z = Math.sin(t * 0.5) * 0.1;
    });
  });

  const setRef = (i: number) => (el: THREE.Object3D | null) => {
    shapes.current[i] = el;
  };

  return (
    <group ref={group} position={[baseX, 0, 0]}>
      <Float speed={1.6} floatIntensity={0.5} rotationIntensity={0.25}>
        {/* 0 — General Dentistry: porcelain orb */}
        <group ref={setRef(0)} scale={0.0001}>
          <mesh>
            <icosahedronGeometry args={[0.95, 4]} />
            <meshPhysicalMaterial
              color="#ffffff"
              roughness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.06}
              envMapIntensity={1.4}
            />
          </mesh>
        </group>

        {/* 1 — Smile Design & Veneers: aligned panel stack */}
        <group ref={setRef(1)} scale={0.0001}>
          {[-0.44, -0.22, 0, 0.22, 0.44].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <RoundedBox args={[0.16, 1.25 - Math.abs(x) * 0.22, 0.14]} radius={0.045} smoothness={4}>
                <meshPhysicalMaterial
                  color="#FDFDFB"
                  roughness={0.06}
                  transmission={0.55}
                  thickness={0.6}
                  ior={1.45}
                  clearcoat={1}
                  envMapIntensity={1.5}
                />
              </RoundedBox>
            </mesh>
          ))}
        </group>

        {/* 2 — RCT: precision silver knot */}
        <group ref={setRef(2)} scale={0.0001}>
          <mesh>
            <torusKnotGeometry args={[0.62, 0.16, 160, 24]} />
            <meshPhysicalMaterial
              color="#D9DEE4"
              roughness={0.16}
              metalness={0.9}
              envMapIntensity={1.6}
            />
          </mesh>
        </group>

        {/* 3 — Aligners: translucent ring */}
        <group ref={setRef(3)} scale={0.0001}>
          <mesh>
            <torusGeometry args={[0.78, 0.2, 32, 96]} />
            <meshPhysicalMaterial
              color="#F4FFF8"
              roughness={0.05}
              transmission={0.92}
              thickness={0.85}
              ior={1.4}
              clearcoat={1}
              envMapIntensity={1.5}
            />
          </mesh>
        </group>

        {/* 4 — Implants: titanium fixture */}
        <group ref={setRef(4)} scale={0.0001}>
          <mesh position={[0, -0.42, 0]}>
            <coneGeometry args={[0.3, 0.75, 24]} />
            <meshPhysicalMaterial color="#B9C2CC" roughness={0.18} metalness={0.95} envMapIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1.0, 24]} />
            <meshPhysicalMaterial color="#CBD3DB" roughness={0.15} metalness={0.95} envMapIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <RoundedBox args={[0.55, 0.3, 0.4]} radius={0.08} smoothness={4}>
              <meshPhysicalMaterial color="#EDEFF2" roughness={0.1} metalness={0.6} clearcoat={1} />
            </RoundedBox>
          </mesh>
        </group>

        {/* 5 — Maxillofacial: sapphire crystal */}
        <group ref={setRef(5)} scale={0.0001}>
          <mesh>
            <octahedronGeometry args={[0.95, 0]} />
            <meshPhysicalMaterial
              color="#16233C"
              roughness={0.08}
              metalness={0.35}
              clearcoat={1}
              envMapIntensity={1.8}
              emissive="#0F172A"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      </Float>
    </group>
  );
}
