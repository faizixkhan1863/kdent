'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import * as THREE from 'three';
import { pointer, scrollState, phases, rangeLocal, smoothstep, lerp } from '../lib/state';

/**
 * PHASE 3 — HYPER-RESOLUTION CLINIC TOUR
 * A low-poly architectural wireframe of the K Dent suite floats in,
 * then "prints" into a photorealistic minimalist treatment room.
 * Glowing mint nodes mark the interactive hotspots (cards live in DOM).
 */
export default function ClinicRoom() {
  const group = useRef<THREE.Group>(null);
  const wire = useRef<THREE.Group>(null);
  const wireMat = useRef<THREE.LineBasicMaterial>(null);
  const photo = useRef<THREE.Mesh>(null);
  const photoMat = useRef<THREE.MeshBasicMaterial>(null);
  const nodes = useRef<THREE.Group>(null);
  const [tex] = useLoader(TextureLoader, ['/kdent/clinic-suite.jpg']);

  const roomLines = useMemo(() => {
    // architectural room: outer shell + chair block + overhead lamp ring
    const edges: THREE.BufferGeometry[] = [];
    const shell = new THREE.EdgesGeometry(new THREE.BoxGeometry(7.6, 4.2, 4.6));
    edges.push(shell);
    const chair = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 0.28, 2.6));
    edges.push(chair);
    const backrest = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.7, 0.26));
    edges.push(backrest);
    const lamp = new THREE.EdgesGeometry(new THREE.TorusGeometry(0.75, 0.07, 8, 32));
    edges.push(lamp);
    const cabinet = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 1.5, 0.5));
    edges.push(cabinet);

    const merge = (geos: THREE.BufferGeometry[], offsets: [number, number, number][]) => {
      const positions: number[] = [];
      geos.forEach((g, i) => {
        const [x, y, z] = offsets[i];
        const pos = g.getAttribute('position');
        // EdgesGeometry is line segments (pairs)
        for (let j = 0; j < pos.count; j++) {
          positions.push(pos.getX(j) + x, pos.getY(j) + y, pos.getZ(j) + z);
        }
      });
      const buffer = new THREE.BufferGeometry();
      buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      return buffer;
    };

    return merge(edges, [
      [0, 0, 0],
      [0, -1.1, 0.7],
      [0, 0.15, -0.75],
      [0, 1.75, -0.7],
      [2.6, -1.0, -1.6],
    ]);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollState.current;
    const local = rangeLocal(p, phases.tour);
    const visible = p > phases.detox.b * 0.75 && p < phases.services.a + 0.015;
    if (group.current) group.current.visible = visible;
    if (!visible) return;

    // printing progress: wireframe → photoreal
    const print = smoothstep(rangeLocal(local, { a: 0.12, b: 0.62 }));
    // exit: dissolve the whole atrium as the services phase arrives
    const exitK = 1 - smoothstep(rangeLocal(local, { a: 0.8, b: 0.99 }));

    // wireframe "prints" then fades
    if (wire.current) {
      wire.current.visible = print < 0.995 && exitK > 0.01;
      wire.current.rotation.y = lerp(-0.55, 0.0, print) + pointer.sx * 0.06;
      wire.current.rotation.x = lerp(0.18, 0.0, print);
      const s = lerp(0.7, 1.0, smoothstep(rangeLocal(local, { a: 0, b: 0.25 })));
      wire.current.scale.setScalar(s);
    }
    if (wireMat.current) {
      wireMat.current.opacity = (1 - print) * 0.55 * exitK;
    }

    // photoreal suite materializes, then dissolves on exit
    if (photo.current) {
      photo.current.visible = print > 0.005 && exitK > 0.01;
      photoMat.current!.opacity = print * exitK;
      photo.current.position.z = lerp(-0.4, 0, print);
      const hover = 1 + Math.sin(t * 0.7) * 0.006;
      photo.current.scale.setScalar(lerp(0.92, 1.0, print) * hover);
    }

    // hotspot nodes pulse
    if (nodes.current) {
      nodes.current.visible = print > 0.6 && exitK > 0.05;
      nodes.current.children.forEach((c, i) => {
        const s = 1 + Math.sin(t * 2 + i * 1.4) * 0.18;
        c.scale.setScalar(Math.max(0.001, s * print * exitK));
      });
      nodes.current.rotation.y = pointer.sx * 0.04;
    }

    // gentle dolly-in
    const cam = state.camera;
    cam.position.z = lerp(cam.position.z, lerp(5.4, 4.1, smoothstep(local)), 0.045);
    cam.position.y = lerp(cam.position.y, lerp(0.4, 0.05, local), 0.05);
    cam.position.x = lerp(cam.position.x, pointer.sx * 0.18, 0.05);
    cam.lookAt(0, 0, 0);
  });

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      {/* wireframe architecture */}
      <group ref={wire}>
        <lineSegments>
          <primitive object={roomLines} attach="geometry" />
          <lineBasicMaterial
            ref={wireMat}
            color="#0F172A"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </lineSegments>
      </group>

      {/* photoreal materialization */}
      <mesh ref={photo} position={[0, 0, -0.4]}>
        <planeGeometry args={[7.4, 4.1]} />
        <meshBasicMaterial
          ref={photoMat}
          map={tex}
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>

      {/* interactive glowing nodes */}
      <group ref={nodes}>
        <mesh position={[-2.35, -0.55, 0.1]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial
            color="#F0FFD4"
            emissive="#D8F5A3"
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.15, -0.5, 0.35]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial
            color="#F0FFD4"
            emissive="#D8F5A3"
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[2.5, -0.35, 0.15]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial
            color="#F0FFD4"
            emissive="#D8F5A3"
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}
