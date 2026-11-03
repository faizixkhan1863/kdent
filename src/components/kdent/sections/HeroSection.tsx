'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronDown, MapPin, Star } from 'lucide-react';

/**
 * PHASE 1 — THE HERO
 * Split-text drift over the living porcelain smile.
 */
export default function HeroSection({ onBook }: { onBook: () => void }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.kd-hero-badge', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.25 })
        .fromTo(
          '.kd-hero-line',
          { yPercent: 110, opacity: 0, rotateX: -45 },
          { yPercent: 0, opacity: 1, rotateX: 0, duration: 1.1, stagger: 0.14 },
          '-=0.4'
        )
        .fromTo('.kd-hero-sub', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=0.55')
        .fromTo('.kd-hero-cta', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.5')
        .fromTo('.kd-hero-hint', { opacity: 0 }, { opacity: 1, duration: 1 }, '-=0.2');
    }, ref.current);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="top"
      data-kd-phase="hero"
      className="relative flex min-h-[130vh] items-start justify-center"
    >
      <div className="kd-hero-inner sticky top-0 flex min-h-screen w-full flex-col items-center justify-center px-5 text-center">
        {/* badge */}
        <div className="kd-hero-badge mb-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur-md">
          <span className="flex items-center gap-1 font-semibold text-[#F0FFD4]">
            <Star className="h-3.5 w-3.5 fill-[#F0FFD4]" /> 5.0
          </span>
          <span className="h-3 w-px bg-white/25" />
          <span>Rated 5.0 by patients in Bani Gala</span>
        </div>

        {/* split-text title */}
        <h1 className="kd-hero-title vel-type max-w-5xl text-[13vw] font-semibold leading-[0.95] tracking-[-0.03em] text-white sm:text-7xl md:text-8xl">
          <span className="block overflow-hidden pb-1">
            <span className="kd-hero-line block">K Dent</span>
          </span>
          <span className="block overflow-hidden pb-2">
            <span className="kd-hero-line block bg-gradient-to-r from-white via-[#F0FFD4] to-white bg-clip-text text-transparent">
              Dental & Aesthetic
            </span>
          </span>
          <span className="block overflow-hidden pb-2">
            <span className="kd-hero-line block bg-gradient-to-r from-[#F0FFD4] via-white to-[#F0FFD4] bg-clip-text text-transparent">
              Care
            </span>
          </span>
        </h1>

        <p className="kd-hero-sub mt-7 max-w-xl text-balance text-base leading-relaxed text-white/70 sm:text-lg">
          Where modern dentistry meets trusted care — precise, personalized and
          compassionate treatment in a calm, fully-sterilized studio in the heart of Bani Gala.
        </p>

        <div className="kd-hero-cta mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={onBook}
            className="kd-cta-primary vel-type group relative overflow-hidden rounded-full bg-[#F0FFD4] px-8 py-4 text-base font-semibold text-[#0F172A] shadow-[0_18px_60px_-12px_rgba(216,245,163,0.45)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span className="relative z-10">Instant Booking</span>
            <span className="kd-cta-sheen" />
          </button>
          <a
            href="#clinic"
            className="rounded-full bg-white/10 px-8 py-4 text-base font-medium text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
          >
            Take the clinic tour
          </a>
        </div>

        <div className="kd-hero-hint mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
          <MapPin className="h-3.5 w-3.5" />
          Farhan Heights · Jinnah Road · Bani Gala, Islamabad
        </div>
      </div>

      {/* scroll cue */}
      <div className="kd-scroll-cue absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60">
        <ChevronDown className="h-6 w-6 animate-bounce" />
        <span className="sr-only">Scroll to explore</span>
      </div>
    </section>
  );
}
