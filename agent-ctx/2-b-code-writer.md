# Task 2-b — Code Writer (scenes + sections)

## Files written (exactly 4, nothing else in src/ touched)
1. `src/components/kdent/scenes/AtelierScene.tsx` — R3F operatory, parts-array → dual groups (solid fades in with `progressRef`, gold wireframe fades out), scale-pop, pulsing hotspots past p>0.5, orbit camera, fog, Lightformer env.
2. `src/components/kdent/scenes/GemScene.tsx` — molten-gold gem, 6 geometries by `variant`, flatShading on polyhedra only, MeshPhysicalMaterial champagne gold, pop-on-change (0.35→1 lerp), float + pointer parallax, tilted sparkle torus + 60 points, transparent canvas.
3. `src/components/kdent/sections/Atelier.tsx` — 300vh driver + sticky viewport, dynamic-imported scene (ssr:false), ScrollTrigger progress → throttled state (quantised /20) for hotspot reveal at p>0.45, pointer-events-none overlay (cards grid pointer-events-auto), img fallback `/kdent/clinic-suite.jpg`, caption rail.
4. `src/components/kdent/sections/Treatments.tsx` — ivory menu, 42%/58% grid, sticky gem frame (hairline ring + ghost numeral + GemScene / conic-gradient fallback), 6 articles with per-article ScrollTrigger active tracking + hover setActive.

## Notes for next agents
- Both scenes default-export, 'use client', Canvas dpr [1,1.75], fov 38, alpha, no network assets (Environment children mode only).
- Atelier consumes a `progressRef: {current:number}` — no re-render coupling with the scene.
- `useWebGLSupport()` returns true during SSR → dynamic scenes mount client-side only; fallbacks render only when WebGL is absent.
- Deviations from literal spec (mobile-fit driven): Atelier hotspot grid `grid-cols-2 lg:grid-cols-4` + line-clamp on mobile; overlay padding `py-20 sm:py-28`; Treatments gem frame capped `max-w-[min(28rem,46vh)]` on mobile.
