'use client';

import { useEffect, useState } from 'react';
import { Instagram } from 'lucide-react';
import { CLINIC, STATS } from '@/lib/kdent-data';
import { FadeIn, RevealText } from '@/components/kdent/ui/Reveal';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import Magnetic from '@/components/kdent/ui/Magnetic';

/* ------------------------------------------------------------------
   Transformations — the light gallery. A gold lens follows the cursor
   and lifts the "after" smile out of the "before"; on touch, a tap
   parts the veil entirely.
------------------------------------------------------------------- */

interface CaseStudy {
  before: string;
  after: string;
  label: string;
}

const CASES: CaseStudy[] = [
  {
    before: '/kdent/smile-before-1.jpg',
    after: '/kdent/smile-after-1.jpg',
    label: 'Case 01 — Whitening & Alignment Ritual',
  },
  {
    before: '/kdent/smile-before-2.jpg',
    after: '/kdent/smile-after-2.jpg',
    label: 'Case 02 — Smile Design',
  },
];

const LENS_RADIUS = 150;

function BeforeAfterCard({ item }: { item: CaseStudy }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [lens, setLens] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsTouch(window.matchMedia('(hover: none)').matches);
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setLens(true);
  };

  const onMouseLeave = () => setLens(false);

  const toggleReveal = () => {
    setRevealed((v) => !v);
    setTouched(true);
  };

  const clipPath = lens
    ? `circle(${LENS_RADIUS}px at ${pos.x}px ${pos.y}px)`
    : revealed
      ? 'circle(150% at 50% 50%)'
      : 'circle(0px at 50% 50%)';

  return (
    <figure className="m-0">
      <div
        data-cursor="hover"
        role="button"
        tabIndex={0}
        aria-label={`${item.label} — press to toggle the after smile`}
        className="lux-frame group relative aspect-[4/5] cursor-none select-none"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={toggleReveal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleReveal();
          }
        }}
      >
        {/* before — the base layer */}
        <img
          src={item.before}
          alt="Smile before treatment"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* after — clipped through the gold lens */}
        <img
          src={item.after}
          alt="Smile after treatment"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          style={{
            clipPath,
            transition: lens ? 'none' : 'clip-path 0.9s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* gold lens ring + centre dot */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full border border-[rgba(230,210,168,0.9)] shadow-[0_0_40px_rgba(198,161,91,0.35)]"
          style={{
            width: LENS_RADIUS * 2,
            height: LENS_RADIUS * 2,
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%,-50%)',
            opacity: lens ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[var(--gold-2)]"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%,-50%)',
            opacity: lens ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />

        {/* corner chips */}
        <span className="absolute left-4 top-4 z-10 rounded-full bg-[rgba(10,9,8,0.72)] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.3em] text-[var(--ivory)] backdrop-blur">
          Before
        </span>
        <span className="absolute right-4 top-4 z-10 rounded-full border border-[rgba(198,161,91,0.55)] bg-[rgba(10,9,8,0.72)] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.3em] text-[var(--gold-2)] backdrop-blur">
          After
        </span>

        {/* touch hint — vanishes after the first tap */}
        {isTouch && !touched && (
          <span className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[rgba(10,9,8,0.72)] px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-[var(--gold-2)] backdrop-blur">
            Tap to reveal
          </span>
        )}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">{item.label}</p>
        <p className="font-display text-sm italic" style={{ color: 'var(--gold-3)' }}>
          Illustrative preview — full gallery @kdent_care
        </p>
      </figcaption>
    </figure>
  );
}

export default function Transformations() {
  return (
    <section
      id="results"
      aria-label="Transformations — before and after"
      className="relative bg-[var(--ivory-2)] py-28 text-[var(--ink)] md:py-40"
    >
      {/* ---- header ---- */}
      <div className="lux-container text-center">
        <FadeIn>
          <Eyebrow center>04 — Transformations</Eyebrow>
        </FadeIn>
        <RevealText
          as="h2"
          className="display-lg mx-auto mt-6"
          lines={[
            <>Smiles,</>,
            <>
              carefully{' '}
              <i className="font-display italic" style={{ color: 'var(--gold-3)' }}>
                re-authored
              </i>
              .
            </>,
          ]}
        />
        <FadeIn delay={0.1} className="mx-auto mt-6 max-w-xl">
          <p className="body-lux text-[var(--ink-muted)]">
            Real patients, quiet confidence. Glide your cursor over each smile — the gold lens
            lifts the veil.
          </p>
        </FadeIn>
      </div>

      {/* ---- the cases ---- */}
      <div className="lux-container mt-16 grid gap-8 md:grid-cols-2 lg:gap-12">
        {CASES.map((item) => (
          <FadeIn key={item.label} delay={0.05} className="min-w-0">
            <BeforeAfterCard item={item} />
          </FadeIn>
        ))}
      </div>

      {/* ---- stats ---- */}
      <div className="lux-container">
        <FadeIn className="mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="border-l border-[rgba(10,9,8,0.1)] px-6 py-8 first:border-l-0 even:border-l-0 md:even:border-l"
              >
                <p className="display-md gold-text">{stat.value}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[var(--ink-muted)]">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{stat.sub}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ---- CTA ---- */}
        <FadeIn className="mt-14 flex justify-center">
          <Magnetic>
            <a
              href={CLINIC.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost-ink"
            >
              See more smiles on Instagram
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
          </Magnetic>
        </FadeIn>
      </div>
    </section>
  );
}
