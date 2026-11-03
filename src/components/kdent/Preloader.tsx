'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Preloader — cinematic overture.
 * Counter 00 → 100, "K DENT" serif reveal, then a split-curtain lift.
 */
export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(true);
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const counter = { v: 0 };
    const letters = root.querySelectorAll('[data-pre-letter]');
    const brandLine = root.querySelector('[data-pre-brand]');
    const subLine = root.querySelector('[data-pre-sub]');
    const panels = root.querySelectorAll('[data-pre-panel]');

    gsap.set(letters, { yPercent: 120, opacity: 0 });
    gsap.set(subLine, { opacity: 0, letterSpacing: '0.9em' });

    const tl = gsap.timeline({
      onComplete: () => {
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete();
        }
      },
    });

    tl.to(letters, {
      yPercent: 0,
      opacity: 1,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.09,
      delay: 0.25,
    })
      .to(
        subLine,
        { opacity: 1, letterSpacing: '0.42em', duration: 1.3, ease: 'power3.out' },
        '-=0.7'
      )
      .to(
        counter,
        {
          v: 100,
          duration: 2.1,
          ease: 'power2.inOut',
          onUpdate: () => setPct(Math.round(counter.v)),
        },
        0.3
      )
      .to(brandLine, { yPercent: -110, duration: 0.9, ease: 'power3.in' }, '+=0.25')
      .to(subLine, { opacity: 0, duration: 0.4 }, '<')
      .to(
        panels,
        { yPercent: -100, duration: 1.15, ease: 'power4.inOut', stagger: 0.08 },
        '-=0.55'
      )
      .set(root, { display: 'none' })
      .add(() => {
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete();
        }
      });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  if (!display) return null;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[95]" aria-hidden="true">
      {/* split curtains */}
      <div data-pre-panel className="absolute inset-x-0 top-0 h-1/2 bg-[var(--ink)]" />
      <div
        data-pre-panel
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--ink)]"
      />

      {/* brand */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div data-pre-brand className="overflow-hidden">
          <h2 className="font-display text-5xl sm:text-7xl font-light tracking-[0.08em] text-[var(--ivory)]">
            {['K', ' ', 'D', 'E', 'N', 'T'].map((ch, i) => (
              <span
                key={i}
                data-pre-letter
                className="inline-block will-change-transform"
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h2>
        </div>
        <p
          data-pre-sub
          className="mt-5 text-[10px] uppercase text-[var(--gold)]"
          style={{ letterSpacing: '0.42em' }}
        >
          Dental &amp; Aesthetic Atelier
        </p>
      </div>

      {/* counter */}
      <div className="absolute bottom-10 right-10 hidden sm:block">
        <span className="font-display text-6xl font-light text-[var(--gold-2)]/70 tabular-nums">
          {String(pct).padStart(3, '0')}
        </span>
        <span className="ml-1 text-xs text-[var(--gold)]/60">/100</span>
      </div>

      {/* progress hairline */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[var(--gold-3)] via-[var(--gold-2)] to-[var(--gold)] transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
