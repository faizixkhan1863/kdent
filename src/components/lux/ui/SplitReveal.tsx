"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../lib/scroll";

type SplitRevealProps = {
  text: string;
  className?: string;
  /** "load" waits for the preloader ready event, "scroll" animates when in view */
  start?: "load" | "scroll";
  delay?: number;
  stagger?: number;
};

/** Splits text into words and reveals them with a masked, staggered rise. */
export default function SplitReveal({
  text,
  className,
  start = "scroll",
  delay = 0,
  stagger = 0.045,
}: SplitRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => text.split(" "), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const inners = el.querySelectorAll<HTMLElement>("[data-word-inner]");

    if (prefersReducedMotion()) {
      gsap.set(inners, { yPercent: 0, rotate: 0 });
      return;
    }

    gsap.set(inners, { yPercent: 118, rotate: 5 });
    const play = () =>
      gsap.to(inners, {
        yPercent: 0,
        rotate: 0,
        duration: 1.15,
        ease: "power4.out",
        stagger,
        delay,
        overwrite: "auto",
      });

    if (start === "load") {
      if (document.documentElement.dataset.kdentReady === "1") {
        play();
      } else {
        window.addEventListener("kdent:ready", play, { once: true });
        return () => window.removeEventListener("kdent:ready", play);
      }
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 86%",
      once: true,
      onEnter: play,
    });
    return () => st.kill();
  }, [text, start, delay, stagger]);

  return (
    <span ref={ref} className={className} aria-label={text} style={{ display: "inline-block" }}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="kd-word" aria-hidden="true">
          <span data-word-inner className="kd-word-inner">
            {word}
          </span>
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
