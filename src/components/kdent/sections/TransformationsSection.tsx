'use client';

import { useEffect, useRef } from 'react';
import { Camera, Star } from 'lucide-react';
import SplitText from '../ui/SplitText';
import BeforeAfterLens from '../ui/BeforeAfterLens';

/**
 * PHASE 5 — LIVE TRANSFORMATIONS
 * A full-screen horizontal gallery. The cursor lens peels the Before
 * layer back to the After, relit in real time.
 */
export default function TransformationsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    let raf = 0;
    let current = 0;

    const loop = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      // ease toward target for butter-smooth horizontal travel
      current += (passed - current) * 0.09;
      const max = Math.max(0, track.scrollWidth - window.innerWidth + 64);
      track.style.transform = `translate3d(${-max * current}px,0,0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      id="results"
      ref={sectionRef}
      data-kd-phase="transform"
      className="relative h-[320vh]"
    >
      <div ref={stickyRef} className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="kd-fade inline-flex items-center gap-2 rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#334155] ring-1 ring-[#0F172A]/10">
                <Camera className="h-3.5 w-3.5" /> Live Transformations
              </span>
              <SplitText
                text="Smiles, re-lit."
                className="vel-type mt-5 text-4xl font-semibold tracking-[-0.02em] text-[#0F172A] sm:text-6xl"
              />
            </div>
            <div className="kd-fade flex items-center gap-3 rounded-2xl bg-white/70 px-5 py-3 ring-1 ring-[#0F172A]/10 backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A] text-[#F0FFD4]">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">5.0 rating · 19 reviews</p>
                <p className="text-xs text-slate-500">Every patient, five stars</p>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-10 flex w-max gap-6 pl-5 pr-16 will-change-transform sm:pl-8"
        >
          <BeforeAfterLens
            before="/kdent/smile-before-1.jpg"
            after="/kdent/smile-after-1.jpg"
            label="Porcelain veneer makeover"
            caption="Staining and uneven edges resolved with a minimal-prep veneer smile design — brightness tuned to skin tone, never artificial."
          />
          <BeforeAfterLens
            before="/kdent/smile-before-2.jpg"
            after="/kdent/smile-after-2.jpg"
            label="Clear aligner correction"
            caption="Crowding corrected with clear aligners — the invisible way. Orthodontic plans from Rs. 5,000 down payment."
          />

          {/* stats panel */}
          <div className="kd-lens-card flex w-[80vw] flex-col justify-between rounded-3xl bg-[#0F172A] p-8 text-white sm:w-[480px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F0FFD4]">
                Why patients rate us 5.0
              </p>
              <ul className="mt-8 space-y-6">
                {[
                  ['100%', 'strict sterilization protocol on every instrument'],
                  ['10–7', 'Mon–Sat hours. Sundays by appointment'],
                  ['PMDC', 'registered specialist care — Dr. Yasir Arafat'],
                  ['Bani Gala', 'neighborhood clinic — no city-centre stress'],
                ].map(([big, small]) => (
                  <li key={big} className="flex items-baseline gap-4">
                    <span className="vel-type min-w-[92px] text-3xl font-bold tracking-tight text-[#F0FFD4]">
                      {big}
                    </span>
                    <span className="text-sm leading-relaxed text-white/70">{small}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-8 rounded-2xl bg-white/[0.06] p-4 text-xs leading-relaxed text-white/60 ring-1 ring-white/10">
              Previews shown are illustrative recreations of typical outcomes.
              Your real before/after gallery is documented in-clinic at every step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
