'use client';

import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  buildBgStops,
  clamp01,
  initKListeners,
  lerp,
  measurePhases,
  phases,
  pointer,
  sampleStops,
  scrollState,
} from './lib/state';
import { useWebGLSupport, useReducedMotion } from '@/hooks/use-webgl';
import Nav from './sections/Nav';
import HeroSection from './sections/HeroSection';
import DetoxSection from './sections/DetoxSection';
import TourSection from './sections/TourSection';
import ServicesSection from './sections/ServicesSection';
import TransformationsSection from './sections/TransformationsSection';
import TeamSection from './sections/TeamSection';
import BookingSection from './sections/BookingSection';
import Footer from './sections/Footer';
import MagneticBookingButton from './ui/MagneticBookingButton';
import Fallback2D from './Fallback2D';

const Experience = dynamic(() => import('./Experience'), { ssr: false });

export default function KDentSite() {
  const webglOk = useWebGLSupport();
  const reduced = useReducedMotion();
  const bgRef = useRef<HTMLDivElement>(null);
  const use3D = webglOk && !reduced;

  /* ---------- global listeners + 60fps choreography loop ---------- */
  useEffect(() => {
    const cleanup = initKListeners();
    measurePhases();

    // debug handle for live inspection
    (window as unknown as Record<string, unknown>).__kd = {
      get p() {
        return scrollState.current;
      },
      get target() {
        return scrollState.target;
      },
      phases,
    };

    // re-measure once fonts/images settle
    const t1 = setTimeout(measurePhases, 800);
    const t2 = setTimeout(measurePhases, 2500);
    const onResize = () => {
      measurePhases();
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    let lastY = scrollState.target;
    const velEls = () => Array.from(document.querySelectorAll<HTMLElement>('.vel-type'));
    let cachedEls: HTMLElement[] = [];
    const refreshEls = () => {
      cachedEls = velEls();
    };
    refreshEls();
    const elInterval = setInterval(refreshEls, 3000);

    const stops = buildBgStops();

    const loop = () => {
      // smooth scroll progress + velocity
      scrollState.target = clamp01(
        window.scrollY /
          Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      );
      const prev = scrollState.current;
      scrollState.current = lerp(scrollState.current, scrollState.target, 0.085);
      const dv = Math.abs(scrollState.target - lastY);
      lastY = scrollState.target;
      scrollState.velocity = lerp(scrollState.velocity, Math.min(1, dv * 30), 0.12);

      // pointer speed (drives fluid typography)
      pointer.speed = lerp(pointer.speed, Math.min(1, Math.abs(pointer.nx) + Math.abs(pointer.ny) > 0.02 ? 0.35 + scrollState.velocity * 0.4 : 0.1), 0.08);

      // background color choreography
      if (bgRef.current) {
        const [r, g, b] = sampleStops(stops, scrollState.current);
        bgRef.current.style.backgroundColor = `rgb(${r},${g},${b})`;
      }

      // fluid variable typography — weight & tracking breathe with the cursor
      if (!reduced) {
        const w = Math.round(560 + pointer.speed * 320);
        const ls = (0.004 - pointer.speed * 0.01).toFixed(4);
        for (const el of cachedEls) {
          el.style.fontVariationSettings = `'wght' ${w}`;
          el.style.letterSpacing = `${ls}em`;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(elInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
      cleanup();
    };
  }, [reduced]);

  /* ---------- GSAP scroll reveals ---------- */
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.kd-fade').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          }
        );
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 1200);
    return () => {
      ctx.revert();
      clearTimeout(t);
    };
  }, [reduced]);

  /* ---------- booking CTA scrolls to the closing chamber ---------- */
  const scrollToBooking = useCallback(() => {
    document.getElementById('book')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);

  return (
    <div className="kd-root relative">
      {/* choreographed background stage (behind WebGL) */}
      <div ref={bgRef} className="fixed inset-0 z-[-1] bg-[#0F172A]" aria-hidden="true" />

      {/* WebGL stage or 2D fallback */}
      {use3D ? <Experience /> : <Fallback2D />}

      <Nav onBook={scrollToBooking} />

      <main className="relative z-10">
        <HeroSection onBook={scrollToBooking} />
        <DetoxSection />
        <TourSection />
        <ServicesSection />
        <TransformationsSection />
        <TeamSection />
        <BookingSection />
      </main>

      <Footer />

      <MagneticBookingButton onClick={scrollToBooking} />
    </div>
  );
}
