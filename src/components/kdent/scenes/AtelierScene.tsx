'use client';

/**
 * AtelierScene — "the blueprint prints into reality"
 * A stylized low-poly dental operatory built from a single parts array,
 * rendered twice: GROUP A (solid porcelain/gold, fading in with scroll)
 * and GROUP B (gold wireframe blueprint, fading out). Scroll progress
 * (0→1) drives materialization, a subtle "printing" scale pop, camera
 * orbit, lamp light and pulsing hotspot nodes.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';

type Vec3 = [number, number, number];
type MatKind = 'porcelain' | 'ink' | 'gold' | 'glow';

type PartSpec =
  | { id: string; kind: 'box'; size: Vec3; segs?: Vec3; pos: Vec3; rot?: Vec3; mat: MatKind }
  | { id: string; kind: 'cyl'; r: number; h: number; pos: Vec3; rot?: Vec3; mat: MatKind }
  | { id: string; kind: 'cone'; r: number; h: number; pos: Vec3; rot?: Vec3; mat: MatKind }
  | { id: string; kind: 'torus'; r: number; tube: number; pos: Vec3; rot?: Vec3; mat: MatKind }
  | { id: string; kind: 'disc'; r: number; pos: Vec3; rot?: Vec3; mat: MatKind };

/* ------------------------------------------------------------------
   The operatory, expressed as data — one source of truth for both
   the solid and the wireframe group.
------------------------------------------------------------------- */
const PARTS: PartSpec[] = [
  // floor + back wall (segmented boxes give the blueprint its grid)
  { id: 'floor', kind: 'box', size: [8, 0.15, 6], segs: [8, 1, 6], pos: [0, -0.08, 0], mat: 'ink' },
  { id: 'wall', kind: 'box', size: [8, 4, 0.12], segs: [8, 4, 1], pos: [0, 2, -3], mat: 'porcelain' },

  // dental chair — pedestal, column, seat, backrest, headrest
  { id: 'chair-base', kind: 'cyl', r: 0.5, h: 0.25, pos: [0, 0.125, 0], mat: 'gold' },
  { id: 'chair-column', kind: 'cyl', r: 0.12, h: 0.55, pos: [0, 0.52, 0], mat: 'gold' },
  { id: 'chair-seat', kind: 'box', size: [1.6, 0.25, 0.9], pos: [0, 0.9, 0.15], rot: [-0.06, 0, 0], mat: 'porcelain' },
  { id: 'chair-back', kind: 'box', size: [1.5, 0.2, 0.7], pos: [0, 1.28, -0.62], rot: [-0.5, 0, 0], mat: 'porcelain' },
  { id: 'chair-head', kind: 'box', size: [0.7, 0.14, 0.4], pos: [0, 1.62, -0.88], rot: [-0.5, 0, 0], mat: 'porcelain' },

  // overhead lamp — drop rod, articulated arm, emissive shade
  { id: 'lamp-rod', kind: 'cyl', r: 0.025, h: 0.7, pos: [0, 2.8, -0.8], mat: 'gold' },
  { id: 'lamp-arm', kind: 'cyl', r: 0.03, h: 0.83, pos: [0, 2.39, -0.39], rot: [1.72, 0, 0], mat: 'gold' },
  { id: 'lamp-head', kind: 'cone', r: 0.32, h: 0.3, pos: [0, 2.18, 0.02], mat: 'glow' },

  // side cabinet — body, drawer lines, gold pulls
  { id: 'cab-body', kind: 'box', size: [1.2, 1.0, 0.6], pos: [2.6, 0.5, -2.55], mat: 'porcelain' },
  { id: 'cab-line-1', kind: 'box', size: [1.08, 0.012, 0.02], pos: [2.6, 0.75, -2.235], mat: 'ink' },
  { id: 'cab-line-2', kind: 'box', size: [1.08, 0.012, 0.02], pos: [2.6, 0.5, -2.235], mat: 'ink' },
  { id: 'cab-line-3', kind: 'box', size: [1.08, 0.012, 0.02], pos: [2.6, 0.25, -2.235], mat: 'ink' },
  { id: 'cab-handle-1', kind: 'cyl', r: 0.022, h: 0.16, pos: [2.6, 0.66, -2.21], rot: [0, 0, Math.PI / 2], mat: 'gold' },
  { id: 'cab-handle-2', kind: 'cyl', r: 0.022, h: 0.16, pos: [2.6, 0.41, -2.21], rot: [0, 0, Math.PI / 2], mat: 'gold' },
  { id: 'cab-handle-3', kind: 'cyl', r: 0.022, h: 0.16, pos: [2.6, 0.16, -2.21], rot: [0, 0, Math.PI / 2], mat: 'gold' },

  // side table
  { id: 'table-top', kind: 'cyl', r: 0.38, h: 0.06, pos: [-2.3, 0.62, -1.5], mat: 'porcelain' },
  { id: 'table-stem', kind: 'cyl', r: 0.045, h: 0.56, pos: [-2.3, 0.31, -1.5], mat: 'gold' },
  { id: 'table-foot', kind: 'cyl', r: 0.22, h: 0.04, pos: [-2.3, 0.03, -1.5], mat: 'gold' },

  // round wall mirror — gold rim + ivory glass
  { id: 'mirror-rim', kind: 'torus', r: 0.45, tube: 0.045, pos: [-2.4, 1.8, -2.84], mat: 'gold' },
  { id: 'mirror-glass', kind: 'disc', r: 0.42, pos: [-2.4, 1.8, -2.88], mat: 'porcelain' },
];

/* glowing promise-nodes: chair · lamp · cabinet · mirror */
const HOTSPOTS: Vec3[] = [
  [0, 1.5, 0.15],
  [0, 2.45, 0.02],
  [2.6, 1.15, -2.2],
  [-2.4, 1.8, -2.7],
];

const ZERO_ROT: Vec3 = [0, 0, 0];

function PartGeometry({ spec }: { spec: PartSpec }) {
  switch (spec.kind) {
    case 'box':
      return (
        <boxGeometry
          args={
            spec.segs
              ? [spec.size[0], spec.size[1], spec.size[2], spec.segs[0], spec.segs[1], spec.segs[2]]
              : spec.size
          }
        />
      );
    case 'cyl':
      return <cylinderGeometry args={[spec.r, spec.r, spec.h, 28]} />;
    case 'cone':
      return <coneGeometry args={[spec.r, spec.h, 28]} />;
    case 'torus':
      return <torusGeometry args={[spec.r, spec.tube, 16, 48]} />;
    case 'disc':
      return <circleGeometry args={[spec.r, 40]} />;
    default:
      return null;
  }
}

function RoomMesh({ spec, material }: { spec: PartSpec; material: THREE.Material }) {
  return (
    <mesh position={spec.pos} rotation={spec.rot ?? ZERO_ROT} material={material}>
      <PartGeometry spec={spec} />
    </mesh>
  );
}

/* ------------------------------------------------------------------
   Operatory — both groups + per-frame choreography
------------------------------------------------------------------- */
function Operatory({ progressRef }: { progressRef: { current: number } }) {
  const camera = useThree((s) => s.camera);
  const solidRef = useRef<THREE.Group>(null);
  const lampLight = useRef<THREE.PointLight>(null);
  const hotspots = useRef<Array<THREE.Mesh | null>>([]);
  const camSmooth = useRef(0);

  const mats = useMemo<Record<MatKind, THREE.MeshStandardMaterial>>(
    () => ({
      porcelain: new THREE.MeshStandardMaterial({
        color: '#e9e1d0',
        roughness: 0.35,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
      }),
      ink: new THREE.MeshStandardMaterial({
        color: '#131009',
        roughness: 0.55,
        metalness: 0.15,
        transparent: true,
        opacity: 0,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: '#c6a15b',
        roughness: 0.28,
        metalness: 1,
        envMapIntensity: 1.2,
        transparent: true,
        opacity: 0,
      }),
      glow: new THREE.MeshStandardMaterial({
        color: '#f7ecd4',
        emissive: '#ffedc9',
        emissiveIntensity: 2.4,
        roughness: 0.4,
        metalness: 0,
        transparent: true,
        opacity: 0,
      }),
    }),
    []
  );

  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c6a15b',
        wireframe: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    []
  );

  const nodeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e6d2a8',
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      Object.values(mats).forEach((m) => m.dispose());
      wireMat.dispose();
      nodeMat.dispose();
    };
  }, [mats, wireMat, nodeMat]);

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const t = state.clock.elapsedTime;

    // GROUP A — reality materializes · GROUP B — blueprint dissolves
    // eslint-disable-next-line react-hooks/immutability -- per-frame THREE material mutation is the idiomatic R3F pattern
    mats.porcelain.opacity = p;
    // eslint-disable-next-line react-hooks/immutability
    mats.ink.opacity = p;
    // eslint-disable-next-line react-hooks/immutability
    mats.gold.opacity = p;
    // eslint-disable-next-line react-hooks/immutability
    mats.glow.opacity = p;
    // eslint-disable-next-line react-hooks/immutability
    wireMat.opacity = 1 - p;
    // eslint-disable-next-line react-hooks/immutability
    wireMat.visible = p < 0.995;

    // the "printing" pop
    if (solidRef.current) solidRef.current.scale.setScalar(0.96 + 0.04 * p);

    // lamp warms up as the room becomes real
    if (lampLight.current) lampLight.current.intensity = 8 * p;

    // promise-nodes pulse past halfway
    hotspots.current.forEach((m, i) => {
      if (!m) return;
      m.visible = p > 0.5;
      if (m.visible) {
        const k = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.35);
        m.scale.setScalar(0.8 + k * 0.9);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * k;
      }
    });

    // slow orbital drift tied to progress (delta-eased for silk)
    camSmooth.current += (p - camSmooth.current) * Math.min(1, delta * 5);
    const angle = -0.5 + camSmooth.current * 1.0;
    camera.position.set(
      Math.sin(angle) * 6.2,
      2.4 + camSmooth.current * 0.8,
      Math.cos(angle) * 6.2
    );
    camera.lookAt(0, 0.9, 0);
  });

  return (
    <>
      {/* GROUP A — solid */}
      <group ref={solidRef}>
        {PARTS.map((spec) => (
          <RoomMesh key={spec.id} spec={spec} material={mats[spec.mat]} />
        ))}
      </group>

      {/* GROUP B — gold wireframe blueprint */}
      <group>
        {PARTS.map((spec) => (
          <RoomMesh key={`wire-${spec.id}`} spec={spec} material={wireMat} />
        ))}
      </group>

      {/* overhead lamp light */}
      <pointLight ref={lampLight} position={[0, 2.02, 0.02]} intensity={0} color="#ffedc9" distance={5} />

      {/* pulsing hotspot nodes */}
      {HOTSPOTS.map((pos, i) => (
        <mesh
          key={i}
          position={pos}
          material={nodeMat}
          visible={false}
          ref={(m) => {
            hotspots.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.07, 20, 20]} />
        </mesh>
      ))}
    </>
  );
}

/* warm atelier reflections — no network assets, pure Lightformers */
function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <color attach="background" args={['#0a0908']} />
      <Lightformer form="rect" intensity={3} color="#e6d2a8" scale={[5, 1.4, 1]} position={[0, 4, -5]} />
      <Lightformer form="rect" intensity={2.2} color="#c6a15b" scale={[0.9, 4, 1]} position={[6, 1.5, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#fff2dd" scale={[4, 3, 1]} position={[-6, 2, -1]} />
      <Lightformer form="circle" intensity={2.4} color="#ffe9c4" scale={2.5} position={[0, 6, 1]} />
    </Environment>
  );
}

export default function AtelierScene({ progressRef }: { progressRef: { current: number } }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 38, position: [0, 0, 6] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#0a0908', 8, 17]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 4, 4]} intensity={20} color="#fff2dd" />
        <Operatory progressRef={progressRef} />
        <StudioEnvironment />
      </Canvas>
    </div>
  );
}
