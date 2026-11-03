'use client';

import { ReactNode, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* ------------------------------------------------------------------
   RevealText — cinematic line-mask reveal for display typography.
   Each entry in `lines` is one masked line (can include styled nodes).
------------------------------------------------------------------- */
export function RevealText({
  lines,
  as = 'h2',
  className = '',
  lineClassName = '',
  delay = 0,
  stagger = 0.16,
  start = 'top 85%',
}: {
  lines: ReactNode[];
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  start?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const inners = el.querySelectorAll<HTMLElement>('[data-reveal-inner]');
    gsap.set(inners, { yPercent: 118, rotate: 1.5 });
    const ctx = gsap.context(() => {
      gsap.to(inners, {
        yPercent: 0,
        rotate: 0,
        duration: 1.5,
        ease: 'power4.out',
        stagger,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [delay, stagger, start]);

  const Tag = as as 'h2';
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <span data-reveal-inner className={`block will-change-transform ${lineClassName}`}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* ------------------------------------------------------------------
   FadeIn — luxury soft rise for blocks of content on scroll.
------------------------------------------------------------------- */
export function FadeIn({
  children,
  className = '',
  delay = 0,
  y = 44,
  duration = 1.25,
  start = 'top 88%',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: 'power3.out',
          delay,
          scrollTrigger: { trigger: el, start, once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [delay, y, duration, start]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
