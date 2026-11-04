"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { scrollState, prefersReducedMotion } from "../lib/scroll";

/* ------------------------------------------------------------------ */
/*  Porcelain material — glossy dental ceramic look                    */
/* ------------------------------------------------------------------ */
function Porcelain() {
  return (
    <meshPhysicalMaterial
      color="#ffffff"
      roughness={0.13}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.08}
      envMapIntensity={1.3}
      sheen={0.45}
      sheenColor="#d8f3ec"
    />
  );
}

function SteelMaterial() {
  return <meshStandardMaterial color="#e6f2ef" metalness={0.85} roughness={0.22} envMapIntensity={1.2} />;
}

type Vec3 = [number, number, number];

type ToothProps = {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
};

/* ------------------------------------------------------------------ */
/*  Molar — crown with 4 cusps, neck, two tapered roots                */
/* ------------------------------------------------------------------ */
function Molar({ position, rotation, scale = 1 }: ToothProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* crown — squircle body, iconic molar mass */}
      <RoundedBox args={[1.9, 1.55, 1.72]} radius={0.52} smoothness={8} steps={2}>
        <Porcelain />
      </RoundedBox>
      {/* cusps — four enamel bumps on the biting surface */}
      {(
        [
          [-0.52, -0.44],
          [0.52, -0.44],
          [-0.52, 0.44],
          [0.52, 0.44],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.62, z]} scale={[0.34, 0.22, 0.34]}>
          <sphereGeometry args={[1, 20, 20]} />
          <Porcelain />
        </mesh>
      ))}
      {/* neck / gum line */}
      <mesh position={[0, -0.62, 0]} scale={[1.02, 0.46, 0.94]}>
        <sphereGeometry args={[1, 32, 32]} />
        <Porcelain />
      </mesh>
      {/* roots */}
      {[-0.38, 0.38].map((x) => (
        <group key={x} position={[x, -0.78, 0]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
          <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.27, 1.15, 28]} />
            <Porcelain />
          </mesh>
          <mesh position={[0, -1.14, 0]}>
            <sphereGeometry args={[0.085, 14, 14]} />
            <Porcelain />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Incisor — single-root front tooth                                  */
/* ------------------------------------------------------------------ */
function Incisor({ position, rotation, scale = 1 }: ToothProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={[0.64, 0.8, 0.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <Porcelain />
      </mesh>
      <mesh position={[0, -0.55, 0]} scale={[0.82, 0.42, 0.68]}>
        <sphereGeometry args={[1, 24, 24]} />
        <Porcelain />
      </mesh>
      <group position={[0, -0.78, 0]} rotation={[0, 0, 0.06]}>
        <mesh position={[0, -0.42, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.2, 0.9, 24]} />
          <Porcelain />
        </mesh>
        <mesh position={[0, -0.86, 0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <Porcelain />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Dental mirror — iconic round mouth mirror                          */
/* ------------------------------------------------------------------ */
function Mirror({ position, rotation, scale = 1 }: ToothProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* handle — vertical rod connecting to the head */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 1.7, 24]} />
        <SteelMaterial />
      </mesh>
      {/* head rim */}
      <mesh>
        <torusGeometry args={[0.44, 0.05, 16, 40]} />
        <SteelMaterial />
      </mesh>
      {/* reflective face */}
      <mesh position={[0, 0, -0.015]} rotation={[0.12, 0, 0]}>
        <circleGeometry args={[0.42, 40]} />
        <meshStandardMaterial color="#f2fbf9" metalness={0.75} roughness={0.1} envMapIntensity={1.6} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Rig — mouse parallax, cursor light, scroll-scrubbed motion         */
/* ------------------------------------------------------------------ */
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const wide = state.size.width >= 1024;
    const reduced = prefersReducedMotion();
    const { pointer } = state;

    const targetRotY = (reduced ? 0 : pointer.x * 0.32 + scrollState.hero * 1.7) + 0.45;
    const targetRotX = (reduced ? 0 : -pointer.y * 0.16 + scrollState.hero * 0.22) + 0.08;
    const targetX = wide ? 1.55 : 0;
    const targetY = (wide ? 0.15 : 0.55) - scrollState.hero * 1.15;
    const targetScale = wide ? 1 : 0.78;

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, 3.5, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, 3.5, dt);
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 3, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 3, dt);
    const s = THREE.MathUtils.damp(g.scale.x, targetScale, 3, dt);
    g.scale.setScalar(s);

    if (light.current) {
      light.current.position.x = THREE.MathUtils.damp(light.current.position.x, pointer.x * 5.5, 5, dt);
      light.current.position.y = THREE.MathUtils.damp(light.current.position.y, pointer.y * 3.2 + 1.2, 5, dt);
    }
  });

  return (
    <>
      <group ref={group}>{children}</group>
      <pointLight ref={light} position={[2.5, 2, 4]} intensity={28} distance={15} decay={2} color="#bff1e8" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export default function ToothScene({ className }: { className?: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Pause rendering when the hero leaves the viewport.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapper} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, -0.1, 8.6], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        frameloop={inView ? "always" : "never"}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 7, 4]} intensity={1.3} />
        <directionalLight position={[-6, 3, -4]} intensity={0.55} color="#8fe0d4" />
        <Suspense fallback={null}>
          <Rig>
            <Float speed={1.3} rotationIntensity={0.18} floatIntensity={0.5}>
              <Molar position={[0, -0.4, 0]} scale={0.92} />
            </Float>
            <Float speed={2.1} rotationIntensity={0.55} floatIntensity={1.3}>
              <Incisor position={[-3.4, -1.4, -0.8]} rotation={[0.25, 0.5, -0.4]} scale={0.72} />
            </Float>
            <Float speed={1.7} rotationIntensity={0.4} floatIntensity={1}>
              <Mirror position={[2.9, 1.55, -1]} rotation={[0.45, 0.35, -0.55]} scale={0.95} />
            </Float>
            <Float speed={1.9} rotationIntensity={0.5} floatIntensity={1.1}>
              <Incisor position={[2.6, -2.2, -1.6]} rotation={[-0.2, -0.6, 0.45]} scale={0.55} />
            </Float>
            <Sparkles count={44} scale={[11, 7, 5]} size={2.2} speed={0.32} opacity={0.55} color="#9ce6da" />
            <Sparkles count={14} scale={[7, 4.5, 3.5]} size={4.5} speed={0.2} opacity={0.32} color="#ffffff" />
          </Rig>
          <ContactShadows position={[0, -2.85, 0]} opacity={0.2} scale={14} blur={2.8} far={4.5} resolution={256} color="#05302f" />
          {/* Procedural studio environment — no external HDR fetch */}
          <Environment resolution={256}>
            <group rotation={[-Math.PI / 3, 0, 0]}>
              <Lightformer form="circle" intensity={4.5} position={[0, 5, -9]} scale={2.2} color="#ffffff" />
              <Lightformer form="rect" intensity={2.6} position={[-5, 1, -1]} scale={[3.5, 0.9, 1]} color="#dcf9f2" />
              <Lightformer form="rect" intensity={2} position={[5, -1, -1]} scale={[3.5, 0.9, 1]} color="#bfeee4" />
              <Lightformer form="rect" intensity={1.2} position={[0, -5, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[4, 1, 1]} color="#ffffff" />
            </group>
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}
