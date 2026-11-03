'use client';

/**
 * Ritual — the light editorial interlude.
 * The anxiety-free care philosophy: a scrub-parallax ghost numeral,
 * line-mask display heading, three rehearsed steps and a USP strip.
 * All ScrollTrigger work is scoped + reverted via gsap.context().
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeartHandshake, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import { FadeIn, RevealText } from '@/components/kdent/ui/Reveal';
import { RITUAL_STEPS } from '@/lib/kdent-data';

const USPS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: 'Hospital-grade sterilization' },
  { icon: HeartHandshake, label: 'Anxiety-free philosophy' },
  { icon: Sparkles, label: 'Digital precision' },
];

export default function Ritual() {
  const sectionRef = useRef<HTMLElement>(null);
  const numeralRef = useRef<HTMLDivElement>(null);

  /* ---------- ghost numeral parallax (scrub) ---------- */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (!numeralRef.current || !sectionRef.current) return;
      gsap.to(numeralRef.current, {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="ritual"
      aria-label="The K Dent ritual — anxiety-free care"
      className="relative overflow-hidden bg-[var(--ivory)] py-28 text-[var(--ink)] md:py-40"
    >
      {/* giant ghost numeral — scrub parallax */}
      <div
        ref={numeralRef}
        aria-hidden="true"
        className="ghost-numeral-ink pointer-events-none absolute -right-6 top-10 hidden text-[26rem] leading-none opacity-70 lg:block"
      >
        01
      </div>

      <div className="lux-container relative">
        <Eyebrow>01 — The Ritual</Eyebrow>

        <RevealText
          as="h2"
          className="display-lg mt-6 max-w-4xl"
          lines={[
            <>Dentistry, rehearsed</>,
            <>
              like a{' '}
              <i className="font-display italic" style={{ color: 'var(--gold-3)' }}>
                ritual
              </i>
              .
            </>,
          ]}
        />

        <FadeIn
          delay={0.1}
          y={40}
          className="body-lux mt-6 max-w-2xl text-[var(--ink-muted)]"
        >
          Before any instrument is lifted, comfort is engineered. Every K Dent visit
          is choreographed to dissolve dental anxiety — for kids, for grandparents,
          for everyone in between.
        </FadeIn>

        <div className="hairline-ink my-14" aria-hidden="true" />

        {/* steps */}
        <div className="grid gap-6 md:grid-cols-3">
          {RITUAL_STEPS.map((step, i) => (
            <FadeIn key={step.index} delay={i * 0.12} className="h-full">
              <article className="lux-card-light h-full p-8">
                <span
                  className="font-display text-4xl italic"
                  style={{ color: 'var(--gold-3)' }}
                >
                  {step.index}.
                </span>
                <h3 className="display-md mt-4">{step.title}</h3>
                <p className="body-lux mt-3 text-[var(--ink-muted)]">{step.detail}</p>
              </article>
            </FadeIn>
          ))}
        </div>

        {/* USP strip */}
        <FadeIn delay={0.15} className="mt-16">
          <ul className="grid gap-6 sm:grid-cols-3">
            {USPS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(10,9,8,0.12)]">
                  <Icon size={20} aria-hidden="true" style={{ color: 'var(--gold-3)' }} />
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
