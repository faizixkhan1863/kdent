# Task 2-a — HeroScene + Hero + Ritual (work record)

## Status: COMPLETE

## Files written (ONLY these 3 + this note)
1. `src/components/kdent/scenes/HeroScene.tsx` — R3F hero centrepiece
2. `src/components/kdent/sections/Hero.tsx` — hero section (`'use client'`)
3. `src/components/kdent/sections/Ritual.tsx` — light editorial section

## Key contracts (verified against existing code)
- `Hero` props: `{ webgl: boolean; ready: boolean; onReserve: () => void; onExplore: () => void }`.
  ⚠️ **INTEGRATION NOTE:** `KDentSite.tsx` currently renders `<Hero webgl onReserve onExplore />` WITHOUT `ready` (TS will complain / entrance stays parked). It already holds `const [ready, setReady] = useState(false)` fed by `<Preloader onComplete={() => setReady(true)} />` — it must pass `ready={ready}` to `<Hero>`. Hero parks all content (yPercent 115 / autoAlpha 0) until `ready === true`.
- Shared components confirmed: `RevealText{lines,as,className,lineClassName,delay,stagger,start}`, `FadeIn{children,className,delay,y,duration,start}` (renders wrapper div, initial opacity 0), `Eyebrow{children,center,className}` (span, NOT ref-forwarding → Hero wraps it in a ref'd div), `Magnetic{children,className,strength}` (renders `div.inline-block`).
- `RITUAL_STEPS` = `{index:"01"…,title,detail}[]` (as const) — card index renders `01.`
- globals.css: `.hairline`/`.hairline-ink` have height+gradient but NO width → supply `w-24` when used inline. `--ink-muted` exists. `.display-xl/-lg/-md` already set the serif family (no extra `font-display` needed). `.btn-gold`/`.btn-ghost-ivory` are inline-flex, min-h 48px.

## Scene implementation notes
- Env: `<Environment resolution={256} frames={1}>` + 3 static Lightformers (warm-white right, gold strip left @4.2, faint top). No presets/network. `frames={1}` bakes once (perf).
- Halo rings: tilts exactly as specced (`[1.15,0.25,0]`, `[1.35,-0.4,0.2]`); counter-rotation done as slow Y-precession on parent groups (±0.07/0.05 rad/s) — spinning a symmetric torus about its own local Z is visually a no-op.
- Pointer light + group parallax use delta-corrected lerp (`1 - Math.exp(-k*delta)` ≈ 0.05/frame @60fps).
- Dust: 260 (120 <768px, checked once via useMemo + typeof window guard), additive, wraps at y=3.5.
- Added responsive `Stage` scale `min(1, max(0.62, viewport.width/6.5))` so the composition holds at 390px (fov 38 → portrait half-width ≈ 1.1 world units).
- `ContactShadows` inside the scale group, outside the parallax group (stays level), y −1.95.

## Deviations (all minor, deliberate)
1. Ring spin = Y-precession instead of literal local-z (invisible no-op).
2. Responsive stage scale for mobile-first framing (spec only covered particle counts).
3. Hero container `pb-36` (spec had pt-24 only) so content never collides with the scroll cue on short screens; cue centered via `inset-x-0` instead of `left-1/2 translate-x` (avoids transform clobbering).
4. Ritual section got `overflow-hidden` + numeral `pointer-events-none` (26rem numeral at `-right-6` would otherwise cause horizontal scroll).
5. "Est. 2026 — Farhan Heights" included in the ready fade-up timeline (unspecified; avoids a static flash mid-choreography).
6. Hero rating copy templated from `CLINIC.rating` (renders the exact specified string).
7. H1 masks use `pb-[0.08em] -mb-[0.08em]` (same trick as shared RevealText) to protect Cormorant italic descenders.

## Handoffs
- `HeroScene` is imported via `dynamic(() => import('../scenes/HeroScene'), { ssr: false })` from Hero — scene file must keep a **default export**.
- Atelier/Treatments agents (2-b/2-c?): follow the same Lightformer-only env pattern; never `Environment preset`.
- `#ritual` and `#top` ids are owned by these files (Nav anchors + Lenis scrollTo depend on them).
