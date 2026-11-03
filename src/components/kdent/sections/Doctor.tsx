'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DOCTOR } from '@/lib/kdent-data';
import { FadeIn, RevealText } from '@/components/kdent/ui/Reveal';
import Eyebrow from '@/components/kdent/ui/Eyebrow';

/* ------------------------------------------------------------------
   Doctor — the maestro. Portrait drifts inside its gold frame while
   the ghost numeral "05" sinks beneath the section as you scroll.
------------------------------------------------------------------- */

export default function Doctor() {
  const sectionRef = useRef<HTMLElement>(null);
  const numeralRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      /* ghost numeral — slow scrubbed sink */
      if (numeralRef.current) {
        gsap.fromTo(
          numeralRef.current,
          { yPercent: 12 },
          {
            yPercent: -10,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }

      /* portrait — breathes inside the frame (scaled to keep edges covered) */
      if (imgRef.current && frameRef.current) {
        gsap.set(imgRef.current, { scale: 1.2 });
        if (!reduced) {
          gsap.fromTo(
            imgRef.current,
            { yPercent: 8 },
            {
              yPercent: -8,
              ease: 'none',
              scrollTrigger: {
                trigger: frameRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            }
          );
        }
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="doctor"
      aria-label="The doctor — Dr. Yasir Arafat"
      className="relative overflow-hidden bg-[var(--ink)] py-28 text-[var(--ivory)] md:py-40"
    >
      {/* ghost numeral */}
      <span
        ref={numeralRef}
        aria-hidden="true"
        className="ghost-numeral pointer-events-none absolute bottom-0 left-0 hidden text-[22rem] leading-none opacity-60 select-none xl:block"
      >
        05
      </span>

      <div className="lux-container relative grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
        {/* ---- portrait ---- */}
        <div className="relative">
          <div ref={frameRef} className="lux-frame aspect-[3/4] max-w-md mx-auto lg:mx-0">
            <img
              ref={imgRef}
              src="/kdent/doctor-portrait.jpg"
              alt="Dr. Yasir Arafat — Principal Dental Surgeon"
              className="h-full w-full object-cover will-change-transform"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* floating PMDC badge */}
          <FadeIn delay={0.2} className="absolute -bottom-8 -right-4 md:-right-8">
            <div className="lux-card p-5">
              <p className="gold-text font-display text-sm font-semibold">PMDC 717176-03-D</p>
              <p className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-[var(--ivory-muted)]">
                Listed practitioner — Pakistan Medical &amp; Dental Council
              </p>
            </div>
          </FadeIn>
        </div>

        {/* ---- dossier ---- */}
        <div className="min-w-0">
          <FadeIn>
            <Eyebrow>05 — The Maestro</Eyebrow>
          </FadeIn>

          <RevealText
            as="h2"
            className="display-lg mt-6"
            lines={[
              <>The hands behind</>,
              <>
                the <span className="serif-accent">smiles</span>.
              </>,
            ]}
          />

          <FadeIn delay={0.1}>
            <p className="gold-text mt-6 font-display text-3xl italic md:text-4xl">
              {DOCTOR.name}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]">
              {DOCTOR.role}
            </p>
            <p className="mt-6 font-display text-xl italic text-[var(--ivory-muted)]">
              &ldquo;{DOCTOR.quote}&rdquo;
            </p>
          </FadeIn>

          {/* credentials ledger */}
          <FadeIn delay={0.15} className="mt-10">
            <ul>
              {DOCTOR.credentials.map((c) => (
                <li
                  key={c.title}
                  className="flex items-baseline justify-between gap-6 border-b border-[rgba(198,161,91,0.14)] py-4"
                >
                  <span className="text-sm font-medium text-[var(--ivory)]">{c.title}</span>
                  <span className="text-right text-xs text-[var(--ivory-muted)]">{c.detail}</span>
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn delay={0.2} className="mt-8">
            <div className="flex flex-wrap gap-2">
              {DOCTOR.chips.map((chip) => (
                <span key={chip} className="lux-chip min-h-[36px]! text-[10px]!">
                  {chip}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
