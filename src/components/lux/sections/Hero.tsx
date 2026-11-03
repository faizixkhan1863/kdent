"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowRight, Star } from "lucide-react";
import ToothScene from "../scenes/ToothScene";
import Magnetic from "../ui/Magnetic";
import SplitReveal from "../ui/SplitReveal";
import Eyebrow from "../ui/Eyebrow";
import { scrollToId, scrollState, prefersReducedMotion } from "../lib/scroll";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);

    // Feed the 3D scene with hero scroll progress.
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
      onUpdate: (self) => {
        scrollState.hero = self.progress;
      },
    });

    // Cinematic content parallax while leaving the hero.
    let contentTween: gsap.core.Tween | null = null;
    if (content && !prefersReducedMotion()) {
      contentTween = gsap.to(content, {
        y: -90,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom 30%",
          scrub: 0.8,
        },
      });
    }

    return () => {
      st.kill();
      contentTween?.scrollTrigger?.kill();
      contentTween?.kill();
      scrollState.hero = 0;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="sec-porcelain relative min-h-[100svh] overflow-hidden"
      aria-label="K Dent — introduction"
    >
      {/* décor rings */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="lux-spin-slow absolute right-[-14%] top-[-22%] h-[46rem] w-[46rem] rounded-full border border-teal/10" />
        <div className="absolute right-[2%] top-[6%] h-[26rem] w-[26rem] rounded-full border border-teal/8" />
        <div className="absolute bottom-[-18%] left-[-10%] h-[30rem] w-[30rem] rounded-full bg-mint/40 blur-3xl" />
      </div>

      {/* 3D porcelain tooth */}
      <ToothScene className="absolute inset-0 z-0 opacity-70 md:opacity-90 lg:opacity-100" />

      {/* legibility veil for the copy on small screens */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_55%_at_28%_60%,rgba(250,252,251,0.9),transparent_70%)] lg:bg-[radial-gradient(ellipse_55%_60%_at_25%_55%,rgba(250,252,251,0.75),transparent_70%)]"
      />

      <div className="lux-container relative z-10 flex min-h-[100svh] items-center pt-28 pb-24 md:pt-32">
        <div ref={contentRef} className="max-w-2xl">
          <div className="[&_span]:!text-teal">
            <SplitReveal
              text="Bani Gala · Islamabad"
              start="load"
              delay={0.15}
              className="eyebrow"
              stagger={0.02}
            />
          </div>

          <h1 className="display-xl mt-6 text-ink">
            <SplitReveal text="Modern dentistry," start="load" delay={0.3} />
            <br />
            <span className="serif-accent">
              <SplitReveal text="porcelain perfect." start="load" delay={0.55} />
            </span>
          </h1>

          <SplitReveal
            text="K Dent is a boutique dental studio where FCPS-led surgical precision meets spa-calm comfort — every smile designed, polished and protected like fine porcelain."
            start="load"
            delay={0.85}
            className="body-lux mt-7 block max-w-xl"
            stagger={0.012}
          />

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Magnetic>
              <button onClick={() => scrollToId("#book")} className="btn-teal" data-cursor>
                Book a visit
                <ArrowRight className="h-4 w-4" />
              </button>
            </Magnetic>
            <Magnetic>
              <button onClick={() => scrollToId("#services")} className="btn-ghost-ink">
                Explore treatments
              </button>
            </Magnetic>
          </div>

          {/* trust strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] font-medium tracking-wide text-muted-ink">
            <span className="inline-flex items-center gap-2">
              <span className="flex text-teal" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
              <span>
                <strong className="font-bold text-ink">5.0</strong> · 19 Google reviews
              </span>
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-teal/50 sm:inline-block" aria-hidden="true" />
            <span>PMDC 717176-03-D</span>
            <span className="hidden h-1 w-1 rounded-full bg-teal/50 sm:inline-block" aria-hidden="true" />
            <span>Mon–Sat 10 AM – 7 PM</span>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <button
        onClick={() => scrollToId("#standard")}
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-muted-ink transition-colors hover:text-teal"
        aria-label="Scroll to next section"
      >
        Scroll
        <span className="lux-float grid h-9 w-9 place-items-center rounded-full border border-teal/30">
          <ArrowDown className="h-3.5 w-3.5 text-teal" />
        </span>
      </button>
    </section>
  );
}
