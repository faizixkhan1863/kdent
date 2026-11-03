'use client';

import { ReactNode, useRef } from 'react';

/** Magnetic — element gently follows the cursor, then springs home. */
export default function Magnetic({
  children,
  className = '',
  strength = 0.32,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transition = 'transform 0.18s cubic-bezier(0.16,1,0.3,1)';
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1)';
    el.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}
