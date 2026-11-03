'use client';

/**
 * Treatments — the light editorial "menu".
 * Left: a molten-gold gem (WebGL) that transforms per active discipline,
 * pinned beside the menu on desktop. Right: six disciplines, tracked by
 * ScrollTrigger — whichever sits at the viewport's centre is active.
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RevealText, FadeIn } from '@/components/kdent/ui/Reveal';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import { TREATMENTS } from '@/lib/kdent-data';

const GemScene = dynamic(() => import('../scenes/GemScene'), { ssr: false });

export default function Treatments({ webgl }: { webgl: boolean }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  /* the centred discipline becomes active — one trigger per article */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const els = listRef.current?.querySelectorAll<HTMLElement>('[data-index]');
    if (!els || els.length === 0) return;
    const triggers = Array.from(els).map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) setActive(i);
        },
      })
    );
    return () => triggers.forEach((tr) => tr.kill());
  }, []);

  return (
    <section
      id="treatments"
      aria-label="The Menu — K Dent treatments"
      className="relative bg-[var(--ivory)] py-28 text-[var(--ink)] md:py-40"
    >
      {/* header */}
      <div className="lux-container text-center">
        <Eyebrow center>03 — The Menu</Eyebrow>
        <RevealText
          as="h2"
          className="display-lg mx-auto mt-6 max-w-3xl text-[var(--ink)]"
          lines={[
            'A menu of',
            <>possible <i className="font-display italic" style={{ color: 'var(--gold-3)' }}>smiles</i>.</>,
          ]}
        />
        <FadeIn delay={0.15} className="body-lux mx-auto mt-6 max-w-xl text-[var(--ink-muted)]">
          Six disciplines, one standard — unhurried, precise, and tailored to the person in the chair.
        </FadeIn>
      </div>

      {/* body */}
      <div className="lux-container mt-16 grid items-start gap-10 lg:grid-cols-[42%_58%]">
        {/* gem column — pins beside the menu on desktop, sits above on mobile */}
        <div className="relative flex h-[46vh] items-center justify-center lg:sticky lg:top-0 lg:h-screen">
          <div className="relative aspect-square w-full max-w-[min(28rem,46vh)] lg:max-w-md" aria-hidden="true">
            <div className="absolute inset-0 scale-110 rounded-full border border-[rgba(143,111,53,0.25)]" />
            <span className="ghost-numeral-ink absolute inset-0 flex items-center justify-center text-[10rem]">
              {TREATMENTS[active].index}
            </span>
            <div className="absolute inset-0">
              {webgl ? (
                <GemScene variant={active} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="lux-spin-slow h-56 w-56 rounded-full bg-[conic-gradient(from_0deg,#8f6f35,#e6d2a8,#c6a15b,#8f6f35)] opacity-80" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* menu column */}
        <FadeIn y={60}>
          <div ref={listRef}>
            {TREATMENTS.map((treatment, i) => (
              <article
                key={treatment.index}
                data-index={i}
                onMouseEnter={() => setActive(i)}
                className="flex min-h-[38vh] flex-col justify-center border-b border-[rgba(10,9,8,0.08)] py-10 last:border-0"
              >
                <div className="flex items-baseline gap-6">
                  <span
                    className="font-display text-2xl italic transition-colors duration-500"
                    style={{ color: active === i ? 'var(--gold-3)' : 'rgba(10,9,8,0.3)' }}
                  >
                    {treatment.index}
                  </span>
                  <h3
                    className={`display-md transition-colors duration-500 ${
                      active === i ? 'text-[var(--gold-3)]' : 'text-[var(--ink)]'
                    }`}
                  >
                    {treatment.title}
                  </h3>
                </div>
                <p className="body-lux mt-3 max-w-lg text-[var(--ink-muted)]">{treatment.detail}</p>
              </article>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
