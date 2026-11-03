"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import gsap from "gsap";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** 0–1, how strongly the element is pulled toward the cursor */
  strength?: number;
};

/** Wraps children in a magnetic field that leans toward the cursor and springs back on leave. */
export default function Magnetic({ children, className, strength = 0.32 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x * strength, y: y * strength, duration: 0.5, ease: "power3.out" });
  }

  function onLeave() {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });
  }

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}
