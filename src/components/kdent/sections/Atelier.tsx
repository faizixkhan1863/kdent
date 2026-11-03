'use client';

/**
 * Atelier — dark pinned scrollytelling chapter.
 * A 300vh scroll driver pins a cinematic viewport in which
 * AtelierScene "prints" the clinic from a gold blueprint; past 45%
 * progress, four hotspot promise-cards stagger up from the bottom.
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RevealText, FadeIn } from '@/components/kdent/ui/Reveal';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import { ATELIER_HOTSPOTS, CLINIC } from '@/lib/kdent-data';

const AtelierScene = dynamic(() => import('../scenes/AtelierScene'), { ssr: false });

export default function Atelier({ webgl }: { webgl: boolean }) {
  const driverRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [p, setP] = useState(0);
  const shown = p > 0.45;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: driverRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        // quantised state — ~20 re-renders across the pin, never per frame
        setP(Math.round(self.progress * 20) / 20);
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section
      id="atelier"
      aria-label={`The Atelier — ${CLINIC.fullName}, ${CLINIC.city}`}
      className="relative bg-[var(--ink)]"
    >
      <div ref={driverRef} className="relative h-[300vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* the printing scene — or a photographic fallback */}
          {webgl ? (
            <div className="absolute inset-0">
              <AtelierScene progressRef={progressRef} />
            </div>
          ) : (
            <>
              <img
                src="/kdent/clinic-suite.jpg"
                alt="The K Dent treatment suite"
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-[var(--ink)] via-[rgba(10,9,8,0.35)] to-[var(--ink)]"
                aria-hidden="true"
              />
            </>
          )}

          {/* overlay — transparent to the cursor except the hotspot cards */}
          <div className="pointer-events-none relative z-10 lux-container flex h-full flex-col justify-between py-20 sm:py-28">
            <div>
              <Eyebrow>02 — The Atelier</Eyebrow>
              <RevealText
                as="h2"
                className="display-lg mt-6 max-w-3xl text-[var(--ivory)]"
                lines={['A studio built', <>like a <span className="serif-accent">promise</span>.</>]}
              />
              <FadeIn delay={0.2} className="body-lux mt-6 max-w-xl text-[var(--ivory-muted)]">
                Every glowing node is a promise K Dent keeps — hover the cards to see what powers each
                visit. Farhan Heights, Jinnah Road, Bani Gala.
              </FadeIn>
            </div>

            <div className="pointer-events-auto">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {ATELIER_HOTSPOTS.map((hotspot, i) => (
                  <div
                    key={hotspot.title}
                    aria-hidden={!shown}
                    className={`transition-all duration-700 ${
                      shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                    }`}
                    style={{
                      transitionDelay: shown ? `${i * 110}ms` : '0ms',
                      transitionTimingFunction: 'var(--ease-lux)',
                    }}
                  >
                    <article className="lux-card h-full p-4 sm:p-5">
                      <span
                        className="gold-pulse block h-1.5 w-1.5 rounded-full bg-[var(--gold-2)]"
                        aria-hidden="true"
                      />
                      <h3 className="mt-3 font-display text-lg text-[var(--ivory)] sm:text-xl">
                        {hotspot.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--ivory-muted)] line-clamp-2 sm:line-clamp-none">
                        {hotspot.detail}
                      </p>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* whisper caption, aligned to the container rail */}
          <p className="pointer-events-none absolute bottom-5 left-[1.5rem] z-10 text-[9px] uppercase tracking-[0.4em] text-[var(--ivory-muted)] md:left-[2.5rem] lg:left-[4rem]">
            Farhan Heights · Jinnah Road · Bani Gala
          </p>
        </div>
      </div>
    </section>
  );
}
