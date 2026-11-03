'use client';

/**
 * Sleek 2D CSS fallback for devices without WebGL (or reduced-motion
 * users). Keeps the cinematic mood: drifting aurora orbs, film grain,
 * mint glows — all pure CSS, zero GPU 3D.
 */
export default function Fallback2D() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="kd-orb kd-orb-a" />
      <div className="kd-orb kd-orb-b" />
      <div className="kd-orb kd-orb-c" />
      <div className="kd-grain" />
      {/* soft smile arc silhouette */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2">
        <div className="kd-smile-2d" />
      </div>
    </div>
  );
}
