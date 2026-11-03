"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "./lib/scroll";

/** Teal cursor dot + trailing ring; grows over interactive elements (pointer-fine only). */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    let shown = false;
    const onMove = (e: MouseEvent) => {
      if (!shown) {
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
        shown = true;
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest("a, button, [data-cursor], input, select, textarea, [role='button']");
      ring.classList.toggle("kd-cursor-hover", Boolean(interactive));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="kd-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="kd-cursor-ring" aria-hidden="true" />
    </>
  );
}
