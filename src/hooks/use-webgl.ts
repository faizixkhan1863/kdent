'use client';

import { useEffect, useState } from 'react';

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return true; // assume capable during SSR
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Detects WebGL (or webgl2) availability in the current browser. */
export function useWebGLSupport(): boolean {
  const [supported] = useState(detectWebGL);

  useEffect(() => {
    if (!supported) {
      console.warn('[TK Dent] WebGL unavailable — switching to 2D fallback.');
    }
  }, [supported]);

  return supported;
}

/** Respects prefers-reduced-motion for accessibility. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(detectReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  return reduced;
}
