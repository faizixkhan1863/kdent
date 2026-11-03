'use client';

import { useEffect, useRef, useState } from 'react';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * PHASE 5 lens — moving the cursor re-lights the panel and "peels back"
 * the Before texture, revealing the After geometry beneath through a
 * live 3D-lit lens. Falls back to a graceful auto-sweep on touch.
 */
export default function BeforeAfterLens({
  before,
  after,
  label,
  caption,
}: {
  before: string;
  after: string;
  label: string;
  caption: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    const after = afterRef.current;
    const ring = ringRef.current;
    if (!wrap || !after || !ring) return;

    const state = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, raf: 0 };
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    const render = () => {
      const R = 130;
      const { tx, ty } = state;
      after.style.clipPath = `circle(${R}px at ${tx * 100}% ${ty * 100}%)`;
      ring.style.left = `${tx * 100}%`;
      ring.style.top = `${ty * 100}%`;
      const rx = (0.5 - ty) * 7;
      const ry = (tx - 0.5) * 9;
      wrap.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };

    const apply = () => {
      state.tx = lerp(state.tx, state.x, 0.16);
      state.ty = lerp(state.ty, state.y, 0.16);
      render();
      state.raf = requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      state.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      state.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      setHint(false);
    };

    // touch devices: cinematic auto-sweep of the lens
    let sweep = 0;
    let int: ReturnType<typeof setInterval> | null = null;
    if (isTouch) {
      int = setInterval(() => {
        sweep += 0.006;
        state.x = 0.5 + Math.sin(sweep) * 0.32;
        state.y = 0.5 + Math.cos(sweep * 0.7) * 0.12;
        setHint(false);
      }, 32);
    } else {
      wrap.addEventListener('pointermove', onMove);
    }

    state.raf = requestAnimationFrame(apply);
    return () => {
      if (int) clearInterval(int);
      wrap.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(state.raf);
    };
  }, []);

  return (
    <div className="kd-lens-card group">
      <div
        ref={wrapRef}
        className="kd-lens-wrap"
        role="img"
        aria-label={`${label} — before and after comparison`}
      >
        {/* BEFORE layer */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${before})` }}
        />
        {/* relight sheen */}
        <div className="kd-lens-sheen absolute inset-0" />
        {/* AFTER layer, revealed through the lens */}
        <div
          ref={afterRef}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${after})`, clipPath: 'circle(0px at 50% 50%)' }}
        />
        {/* lens ring */}
        <div ref={ringRef} className="kd-lens-ring" />
        <div className="kd-lens-tag kd-lens-tag-before">Before</div>
        <div className="kd-lens-tag kd-lens-tag-after">After · K Dent</div>
        {hint && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 opacity-80 backdrop-blur">
            Move your cursor — the lens reveals the result
          </div>
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-slate-900">{label}</h4>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">{caption}</p>
      </div>
    </div>
  );
}
