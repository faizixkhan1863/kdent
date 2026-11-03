"use client";

/** Shared mutable scroll state, updated by GSAP ScrollTriggers and read inside the R3F loop. */
export const scrollState = {
  /** 0 → 1 progress of the hero section scrolling away */
  hero: 0,
  /** 0 → 1 progress of the horizontal clinic tour */
  tour: 0,
};

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type LenisLike = {
  scrollTo: (target: string | number | HTMLElement, options?: Record<string, unknown>) => void;
  stop: () => void;
  start: () => void;
};

let lenisInstance: LenisLike | null = null;

export function setLenis(instance: LenisLike | null) {
  lenisInstance = instance;
}

export function getLenis(): LenisLike | null {
  return lenisInstance;
}

export function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(id) as HTMLElement | null;
  if (!el) return;
  if (lenisInstance) {
    lenisInstance.scrollTo(el, { offset: -8, duration: 1.5 });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
