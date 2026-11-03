'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// register once at module load (browser only)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Split-text drift reveal: characters drift up from a blurred depth
 * with a soft stagger when scrolled into view.
 * Words are kept unbreakable so line wrapping stays natural.
 */
export default function SplitText({
  text,
  className = '',
  as: Tag = 'h2',
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const chars = el.querySelectorAll('[data-char]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { yPercent: 120, opacity: 0, rotateX: -60, filter: 'blur(6px)' },
        {
          yPercent: 0,
          opacity: 1,
          rotateX: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          delay,
          ease: 'power3.out',
          stagger: 0.02,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: once ? 'play none none none' : 'play none none reverse',
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [text, delay, once]);

  const words = text.split(' ');
  const TagEl = Tag as 'h2';

  return (
    <TagEl ref={ref as never} className={`kd-split ${className}`} aria-label={text}>
      {words.map((word, wi) => (
        <span
          key={wi}
          className="inline-block whitespace-nowrap will-change-transform"
          aria-hidden="true"
        >
          {word.split('').map((ch, ci) => (
            <span
              key={ci}
              data-char
              className="inline-block will-change-transform"
            >
              {ch}
            </span>
          ))}
          {wi < words.length - 1 ? '\u00A0' : null}
        </span>
      ))}
    </TagEl>
  );
}
