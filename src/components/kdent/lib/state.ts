'use client';

/**
 * Global mutable state shared between the DOM scrollytelling layers
 * and the WebGL experience. Kept outside React to avoid re-renders
 * inside the 60fps loop.
 */

export type PhaseKey =
  | 'hero'
  | 'detox'
  | 'tour'
  | 'services'
  | 'transform'
  | 'team'
  | 'booking';

export type Range = { a: number; b: number };

export const scrollState = {
  /** smoothed progress 0..1 across the whole document */
  current: 0,
  /** raw target progress 0..1 */
  target: 0,
  /** smoothed scroll velocity (px/frame, normalized) */
  velocity: 0,
};

export const pointer = {
  /** raw client px */
  x: 0,
  y: 0,
  /** normalized -1..1 */
  nx: 0,
  ny: 0,
  /** smoothed pointer position for 3D light */
  sx: 0,
  sy: 0,
  /** smoothed mouse speed 0..1 (drives fluid typography) */
  speed: 0,
};

export const phases: Record<PhaseKey, Range> = {
  hero: { a: 0, b: 0.16 },
  detox: { a: 0.16, b: 0.3 },
  tour: { a: 0.3, b: 0.46 },
  services: { a: 0.46, b: 0.62 },
  transform: { a: 0.62, b: 0.78 },
  team: { a: 0.78, b: 0.9 },
  booking: { a: 0.9, b: 1 },
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** remap p from [a,b] to 0..1 clamped */
export const rangeLocal = (p: number, r: Range) =>
  clamp01((p - r.a) / Math.max(0.0001, r.b - r.a));

/** is p inside range (with optional margin) */
export const inRange = (p: number, r: Range, margin = 0.02) =>
  p >= r.a - margin && p <= r.b + margin;

/**
 * Reads the real offsets of every section marked with data-kd-phase
 * and stores their normalized scroll ranges. Re-run on resize/refresh.
 */
export function measurePhases() {
  if (typeof window === 'undefined') return;
  const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const keys = Object.keys(phases) as PhaseKey[];
  for (const key of keys) {
    const el = document.querySelector<HTMLElement>(`[data-kd-phase="${key}"]`);
    if (!el) continue;
    const top = el.offsetTop;
    const height = el.offsetHeight;
    phases[key] = {
      a: clamp01((top - window.innerHeight * 0.35) / docH),
      b: clamp01((top + height - window.innerHeight * 0.2) / docH),
    };
  }
  // hero always starts at absolute zero
  phases.hero.a = 0;
  phases.booking.b = 1;
}

let listenersBound = false;

export function initKListeners() {
  if (listenersBound || typeof window === 'undefined') return () => {};
  listenersBound = true;

  const onScroll = () => {
    const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollState.target = clamp01(window.scrollY / docH);
  };
  const onMove = (e: MouseEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });
  onScroll();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('mousemove', onMove);
    listenersBound = false;
  };
}

/* ---------- background color choreography ---------- */

type Stop = { t: number; color: [number, number, number] };

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const SAPPHIRE = '#0F172A';
const WHITE = '#FFFFFF';
const MIST = '#EBF3EF';
const IVORY = '#F7F9F8';

/**
 * Builds bg stops from the *measured* section ranges so the color
 * choreography always matches the real layout.
 */
export function buildBgStops(): Stop[] {
  return [
    { t: 0, color: hexToRgb(SAPPHIRE) },
    { t: phases.hero.b * 0.55, color: hexToRgb(SAPPHIRE) },
    { t: phases.hero.b, color: hexToRgb(WHITE) },
    { t: lerp(phases.detox.a, phases.detox.b, 0.55), color: hexToRgb(MIST) },
    { t: phases.detox.b, color: hexToRgb(WHITE) },
    { t: phases.tour.b, color: hexToRgb(IVORY) },
    { t: phases.services.b, color: hexToRgb(IVORY) },
    { t: phases.team.b * 0.9, color: hexToRgb(IVORY) },
    { t: Math.min(1, phases.booking.a + 0.02), color: hexToRgb(SAPPHIRE) },
    { t: 1, color: hexToRgb('#0B1120') },
  ];
}

export function sampleStops(stops: Stop[], t: number): [number, number, number] {
  if (t <= stops[0].t) return stops[0].color;
  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (t >= s0.t && t <= s1.t) {
      const k = clamp01((t - s0.t) / Math.max(0.0001, s1.t - s0.t));
      return [
        Math.round(lerp(s0.color[0], s1.color[0], k)),
        Math.round(lerp(s0.color[1], s1.color[1], k)),
        Math.round(lerp(s0.color[2], s1.color[2], k)),
      ];
    }
  }
  return stops[stops.length - 1].color;
}
