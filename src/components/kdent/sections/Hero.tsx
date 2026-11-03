'use client';

/**
 * Hero — the atelier overture.
 * Everything is strictly gated on `ready` (the preloader's onComplete):
 * masked H1 line reveal → eyebrow / sub / rating / CTAs fade-up cascade,
 * plus a looping scroll cue. 3D layer mounts only when WebGL is available.
 */

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ArrowDown, CalendarCheck, Star } from 'lucide-react';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import Magnetic from '@/components/kdent/ui/Magnetic';
import { CLINIC } from '@/lib/kdent-data';

const HeroScene = dynamic(() => import('../scenes/HeroScene'), { ssr: false });

type HeroProps = {
  webgl: boolean;
  ready: boolean;
  onReserve: () => void;
  onExplore: () => void;
};

export default function Hero({ webgl, ready, onReserve, onExplore }: HeroProps) {
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const estRef = useRef<HTMLParagraphElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  /* ---------- entrance choreography — plays only once `ready` is true ---------- */
  useEffect(() => {
    const inners = [line1Ref.current, line2Ref.current].filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    const fades = [
      eyebrowRef.current,
      subRef.current,
      ratingRef.current,
      ctaRef.current,
      cueRef.current,
      estRef.current,
    ].filter((el): el is HTMLElement => el !== null);

    // parked states (hidden behind the preloader curtain)
    gsap.set(inners, { yPercent: 115 });
    gsap.set(fades, { autoAlpha: 0, y: 28 });

    if (!ready) return;

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to(inners, { yPercent: 0, duration: 1.5, stagger: 0.14 }, 0)
      .to(eyebrowRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.35)
      .to(subRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.6)
      .to(ratingRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.75)
      .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.9)
      .to(cueRef.current, { autoAlpha: 1, y: 0, duration: 1 }, 1.1)
      .to(estRef.current, { autoAlpha: 1, y: 0, duration: 1 }, 1.15);

    // gold dot — eternal descent down the 56px hairline
    const dotTween = gsap.fromTo(
      dotRef.current,
      { y: 0, opacity: 1 },
      {
        y: 40,
        opacity: 0.15,
        duration: 1.6,
        ease: 'power1.inOut',
        repeat: -1,
        yoyo: true,
        repeatDelay: 0.35,
      },
    );

    return () => {
      tl.kill();
      dotTween.kill();
    };
  }, [ready]);

  return (
    <section
      id="top"
      aria-label="K Dent — Dental & Aesthetic Atelier introduction"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink)]"
    >
      {/* ---- 3D centrepiece (or photographic fallback) ---- */}
      {webgl ? (
        <div className="absolute inset-0">
          <HeroScene />
        </div>
      ) : (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kdent/clinic-suite.jpg"
            alt="The K Dent treatment suite — calm, softly lit, fully sterilised"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,161,91,0.14),transparent_60%)]" />
        </div>
      )}

      {/* ---- gradient scrim for nav legibility ---- */}
      <div
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent"
        aria-hidden="true"
      />

      {/* ---- content ---- */}
      <div className="lux-container relative z-10 pb-36 pt-24 text-center">
        <div ref={eyebrowRef}>
          <Eyebrow center>
            Bani Gala · Islamabad — A Private Dental &amp; Aesthetic Atelier
          </Eyebrow>
        </div>

        <h1 className="display-xl mt-7">
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span ref={line1Ref} className="block will-change-transform">
              The Art of the
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span ref={line2Ref} className="block will-change-transform">
              <span className="serif-accent">Confident</span> Smile
            </span>
          </span>
        </h1>

        <p
          ref={subRef}
          className="body-lux mx-auto mt-8 max-w-2xl text-[var(--ivory-muted)]"
        >
          K Dent — where clinical precision meets couture care. Smile design, gentle
          root canals, clear aligners and implants, composed in a calm,
          fully-sterilized studio in the heart of Bani Gala.
        </p>

        <div ref={ratingRef} className="mt-9 flex items-center justify-center gap-4">
          <span className="hairline hidden w-24 sm:block" aria-hidden="true" />
          <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
            <Star
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--gold)', fill: 'var(--gold)' }}
            />
            <span className="text-[11px] uppercase leading-relaxed tracking-[0.25em] text-[var(--ivory-muted)]">
              {CLINIC.rating.value} — Rated by patients in Bani Gala ·{' '}
              {CLINIC.rating.count} reviews
            </span>
          </p>
          <span className="hairline hidden w-24 sm:block" aria-hidden="true" />
        </div>

        <div
          ref={ctaRef}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Magnetic strength={0.3}>
            <button type="button" className="btn-gold" onClick={onReserve}>
              Reserve a Chair
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            </button>
          </Magnetic>
          <button type="button" className="btn-ghost-ivory" onClick={onExplore}>
            Explore the Atelier
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ---- scroll cue ---- */}
      <div
        ref={cueRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-4"
      >
        <span className="text-[9px] uppercase tracking-[0.5em] text-[var(--ivory-muted)]">
          Scroll
        </span>
        <span className="relative block h-14 w-px bg-[rgba(243,238,228,0.16)]">
          <span
            ref={dotRef}
            className="absolute top-0 block h-2 w-2 rounded-full"
            style={{
              left: 'calc(50% - 4px)',
              background: 'var(--gold)',
              boxShadow: '0 0 10px rgba(198, 161, 91, 0.75)',
            }}
          />
        </span>
      </div>

      {/* ---- est. mark ---- */}
      <p
        ref={estRef}
        className="absolute bottom-8 right-8 z-10 hidden text-[9px] uppercase tracking-[0.4em] text-[var(--ivory-muted)] md:block"
      >
        Est. 2026 — Farhan Heights
      </p>
    </section>
  );
}
