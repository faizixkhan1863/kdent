'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion, useWebGLSupport } from '@/hooks/use-webgl';
import Preloader from './Preloader';
import Cursor from './Cursor';
import Nav from './sections/Nav';
import Hero from './sections/Hero';
import Ritual from './sections/Ritual';
import Atelier from './sections/Atelier';
import Treatments from './sections/Treatments';
import Transformations from './sections/Transformations';
import Doctor from './sections/Doctor';
import Reserve from './sections/Reserve';
import Footer from './sections/Footer';

export default function KDentSite() {
  const webgl = useWebGLSupport();
  const reduced = useReducedMotion();

  const lenisRef = useRef<Lenis | null>(null);
  const [ready, setReady] = useState(false);

  /* ---------- Lenis inertia scroll — wired into GSAP's ticker ---------- */
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.45,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenisRef.current = lenis;
    (window as unknown as Record<string, unknown>).__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // hold the curtain until the preloader finishes
    lenis.stop();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      (window as unknown as Record<string, unknown>).__lenis = undefined;
    };
  }, [reduced]);

  useEffect(() => {
    if (!ready) return;
    lenisRef.current?.start();
    const t = setTimeout(() => ScrollTrigger.refresh(), 900);
    return () => clearTimeout(t);
  }, [ready]);

  /* ---------- luxury glide to anchors ---------- */
  const scrollToId = useCallback(
    (id: string) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(id, { duration: 1.8, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
      } else {
        document.querySelector(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }
    },
    [reduced]
  );

  const goReserve = useCallback(() => scrollToId('#book'), [scrollToId]);
  const goExplore = useCallback(() => scrollToId('#ritual'), [scrollToId]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--ink)] text-[var(--ivory)] overflow-x-clip">
      <Preloader onComplete={() => setReady(true)} />
      <Cursor />

      {/* cinematic texture layers */}
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <Nav onReserve={goReserve} />

      <main className="relative z-10 flex-1">
        <Hero webgl={webgl} ready={ready} onReserve={goReserve} onExplore={goExplore} />
        <Ritual />
        <Atelier webgl={webgl} />
        <Treatments webgl={webgl} />
        <Transformations />
        <Doctor />
        <Reserve />
      </main>

      <Footer onReserve={goReserve} />
    </div>
  );
}
