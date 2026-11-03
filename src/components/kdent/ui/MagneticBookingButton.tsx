'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';

/**
 * Persistent, magnetic floating "Instant Booking" button.
 * The cursor's gravity gently pulls it; releasing springs it back.
 */
export default function MagneticBookingButton({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const RADIUS = 150;
      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * 26;
        x.set((dx / (dist || 1)) * pull);
        y.set((dy / (dist || 1)) * pull);
        setShowLabel(true);
      } else {
        x.set(0);
        y.set(0);
        setShowLabel(false);
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#0F172A] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-8px_rgba(15,23,42,0.55)] ring-1 ring-white/20 transition-colors hover:bg-[#1E293B] sm:bottom-8 sm:right-8"
      aria-label="Instant booking — book a dental appointment"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D8F5A3] opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#D8F5A3]" />
      </span>
      <span className="hidden sm:inline">Instant Booking</span>
      <span className="sm:hidden">Book</span>
      <CalendarCheck className={`h-4 w-4 transition-all ${showLabel ? 'translate-x-0.5 opacity-100' : ''}`} />
    </motion.button>
  );
}
