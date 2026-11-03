"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "./lib/scroll";

/** Porcelain curtain with K monogram — lifts once fonts are ready. */
export default function Preloader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const announceReady = () => {
      document.documentElement.dataset.kdentReady = "1";
      window.dispatchEvent(new Event("kdent:ready"));
    };

    if (prefersReducedMotion()) {
      gsap.set(el, { display: "none" });
      announceReady();
      return;
    }

    let killed = false;
    let tl: gsap.core.Timeline | null = null;
    document.body.style.overflow = "hidden";

    const start = () => {
      if (killed) return;
      const q = gsap.utils.selector(el);
      gsap.set(q("[data-pre-bar]"), { transformOrigin: "left center", scaleX: 0 });
      tl = gsap
        .timeline({ defaults: { ease: "power3.inOut" } })
        .to(q("[data-pre-bar]"), { scaleX: 1, duration: 0.85, ease: "power2.inOut" })
        .to(q("[data-pre-fade]"), {
          yPercent: -140,
          opacity: 0,
          duration: 0.55,
          stagger: 0.07,
          ease: "power3.in",
        }, "-=0.15")
        .add(announceReady, "-=0.3")
        .to(el, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "-=0.25")
        .set(el, { display: "none" })
        .add(() => {
          document.body.style.overflow = "";
        });
    };

    Promise.all([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 750)),
    ]).then(start);

    return () => {
      killed = true;
      tl?.kill();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-porcelain"
      role="status"
      aria-label="Loading K Dent"
    >
      <div data-pre-fade className="font-display text-[5.5rem] leading-none text-ink md:text-[7rem]">
        K
      </div>
      <div
        data-pre-fade
        className="mt-4 text-[10px] font-semibold uppercase tracking-[0.5em] text-teal"
      >
        Dental &amp; Aesthetic Care
      </div>
      <div data-pre-bar className="mt-8 h-px w-40 bg-teal/70" />
    </div>
  );
}
