"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;
  tw: number;
  color: string;
};

/** Enamel-shimmer particle field — reacts to scroll velocity. */
export default function EnamelParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spawn = (init = false): Particle => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 12,
      r: 0.6 + Math.random() * 2.1,
      speed: 0.16 + Math.random() * 0.5,
      opacity: 0.14 + Math.random() * 0.55,
      tw: Math.random() * Math.PI * 2,
      color: Math.random() < 0.72 ? "156,230,218" : "255,255,255",
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const parts: Particle[] = Array.from({ length: 110 }, () => spawn(true));

    let visible = false;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // Run the rAF loop only while on screen — hidden sections cost nothing.
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);

    let lastY = window.scrollY;
    let boost = 0;
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      boost = Math.min(7, boost + dy * 0.018);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);

    let t = 0;
    const tick = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
      t += 0.016;
      boost *= 0.94;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.speed * (1 + boost);
        p.x += Math.sin(t * p.speed * 2 + p.tw) * 0.32;
        p.tw += 0.012;
        if (p.y < -12) Object.assign(p, spawn());
        if (p.x < -12) p.x = w + 10;
        if (p.x > w + 12) p.x = -10;
        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(t * 2 + p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
        ctx.fill();
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
