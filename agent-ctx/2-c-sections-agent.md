# Task 2-c — Work Record: Nav, Marquee, Transformations, Doctor, Reserve, Footer

**Agent:** sections-agent (2-c)
**Task ID:** 2-c
**Scope:** Wrote exactly 6 files under `src/components/kdent/sections/`. No other source files touched. No build/dev/lint commands run.

---

## Files Written

### 1. `src/components/kdent/sections/Nav.tsx`
- Fixed header, transparent → blurred ink bar past `scrollY > 40` (state `scrolled`, passive listener; py-6 → py-3 + gold hairline + shadow).
- Brand block ("K Dent" + tracked atelier descriptor), center links (lg+) with animated gold under-hairline scale-in, phone link (md+), Magnetic Reserve button.
- Exported `smoothScroll()`: Lenis-aware via typed `(window as unknown as {__lenis})` cast (1.6s glide; `#top` → 0), `scrollIntoView` fallback.
- Full-screen mobile menu (`z-[60]`, rgba(10,9,8,0.96) + blur): staggered serif links via CSS transition-delay, Escape-to-close, tabIndex gating when closed, `aria-expanded`/`aria-controls`, phone + Reserve at bottom. Reserve button fade lives on a wrapper div because `.btn-gold` owns the button's own transition properties.

### 2. `src/components/kdent/sections/Marquee.tsx`
- Dual identical `marquee-track` siblings → seamless -50% CSS loop; item → tracked uppercase text + gold ✦; ribbon `aria-hidden`, border-y gold/16 on `--ink-2`, reduced-motion safe.

### 3. `src/components/kdent/sections/Transformations.tsx`
- Light section `id="results"` on `--ivory-2`; Eyebrow "04 — Transformations"; RevealText "Smiles, carefully *re-authored*." (gold-3 italic on ivory); FadeIn sub copy.
- In-file `BeforeAfterCard`: before img base; after img clipped by `circle(150px at x y)` gold lens mapped through `getBoundingClientRect()`; 300px lens ring + center dot (translate -50%,-50%, opacity-fade); "Before"/"After" corner chips (z-10 above the lux-frame hairline); `data-cursor="hover"`, `cursor-none`, `role="button"` + Enter/Space toggle for a11y.
- Touch path: `(hover: none)` matchMedia → "Tap to reveal" hint chip, hidden after first toggle; click toggles full `circle(150%)` reveal, clip-path eases `cubic-bezier(0.16,1,0.3,1)` (transition `none` while lensing).
- Cases: `/kdent/smile-{before,after}-{1,2}.jpg` (assets confirmed present in `public/kdent/`).
- Stats row from `STATS` — `display-md gold-text` values, border-l cells with `first:border-l-0 even:border-l-0 md:even:border-l` (no stray edge line in the 2-col mobile layout). Instagram CTA via Magnetic + `btn-ghost-ink`.

### 4. `src/components/kdent/sections/Doctor.tsx`
- Dark `id="doctor"`; ghost numeral "05" (xl+ only) scrubbed `yPercent 12 → -10` (ScrollTrigger, section trigger, scrub true).
- Portrait in `lux-frame aspect-[3/4]`: `gsap.set(scale 1.2)` + scrubbed `yPercent 8 → -8`. Deviation note: brief said "yPercent -10, scale 1.12" — that literal pair exposes a ~4% gap at the frame's bottom edge mid-scrub; amplitude kept inside the scale overhang so no edge ever shows. Skipped entirely under `prefers-reduced-motion`. `gsap.registerPlugin` in useEffect; single `gsap.context` + `ctx.revert()` cleanup.
- Floating PMDC badge (`lux-card` absolute -bottom-8 -right-4 md:-right-8), gold-text name in italic serif, role eyebrow, curly-quoted testimonial, credentials ledger (5 rows, baseline split), 4 specialty `lux-chip` spans (`min-h-[36px]! text-[10px]!` — non-interactive spans, so 36px is compliant).

### 5. `src/components/kdent/sections/Reserve.tsx` — booking engine
- `id="book"` on `--ink-2`. Steps: **01 day** — 14 days from tomorrow built in `useEffect` (SSR shows 8 pulse skeleton chips, no hydration drift); Sunday chips render "Sun·appt" dimmed; **02 time** — 10 `TIME_SLOTS` with Clock icon, Sunday prepends gold "Sunday — priority appointments only" note chip; **03 ritual** — 6 `TREATMENTS` titles + "Not sure — advise me"; **04 details** — name/phone grid + notes textarea. All chip groups `aria-pressed`, fieldsets/legends, labels wired via htmlFor, 44px chip targets.
- API contract implemented verbatim: POST `/api/bookings`, `{name, phone, service, date: "Weekday, DD Mon YYYY", timeSlot: slot + " (Sunday — by appointment)" on Sundays, notes: string|null}`; typed `BookingResponse`; ref = last 6 of bookingId uppercased; `window.open(whatsappUrl)` in try/catch; failure → red-300/90 alert with phone fallback. `canSubmit` per brief. Disabled submit styled with inline style (bulletproof over unlayered `.btn-gold`) + Loader2 "Reserving…".
- Success state: gold gradient disc + CheckCircle2(#0a0908), "Booked. Breathe easy.", mono `#REF` + service/date/slot line, "Confirm on WhatsApp" (`btn-gold`) + "Book another visit" (`btn-ghost-ivory`, full reset).
- Info rail: MapPin / Phone / Instagram `lux-card` trio (directions, tel:, @kdent_care).

### 6. `src/components/kdent/sections/Footer.tsx`
- `MARQUEE_ITEMS` ribbon on top; `mt-auto` footer, `lg:grid-cols-[1.4fr_1fr_1fr_1fr]`: Brand (display-lg wordmark + gold italic signature), Navigate (Lenis-aware anchors + "Reserve a Chair" → `onReserve`), Visit (address + `CLINIC.hours` + directions), Connect (tel, Instagram, `CLINIC.facebookNote`). `hairline my-12`, colophon: © year + fullName / PMDC 717176-03-D · Crafted with precision in Islamabad.

---

## Decisions & Micro-deviations (all intentional, all noted)

1. **Tailwind v4 important syntax**: project is Tailwind 4 (`@import "tailwindcss"`); the custom classes in globals.css are **unlayered**, so plain utilities lose the cascade against `.btn-gold`/`.lux-chip`. Used v4 trailing-`!` (`min-h-[42px]!`, `gap-0.5!`, `text-[10.5px]!`…) wherever the brief wrote v3 prefix `!` (which v4 silently ignores). Reserve's disabled button additionally sets inline styles — guaranteed greyed-out look regardless of cascade order.
2. **`(window as any)` → typed cast** `(window as unknown as { __lenis?: LenisLike })` — identical behavior, strict-TS clean, no `no-explicit-any` lint risk.
3. **Doctor portrait amplitude**: `scale 1.2, yPercent ±8` instead of `1.12/-10` — see above; same intent, zero gap risk.
4. **Stats markup**: plain `<div>/<p>` instead of `dl/dt/dd` (spec'd visual order value→label→sub is invalid dd-before-dt semantics); added the `even:` border fix for 2-col mobile.
5. **Reserve state**: single typed `Confirmation` object instead of separate `ref`/`waUrl` states — same render, no null-guards in JSX.
6. **service payload fallback**: `service ?? 'Not sure — advise me'`. The brief left service nullable, but the (already-written) `/api/bookings` zod schema requires `string.min(2)` — sending null would 400. UI stays optional per brief; payload is always valid.
7. **Nav mobile Reserve/phone fades** moved onto wrapper elements so `.btn-gold`'s own transition declarations aren't overridden mid-animation.

## ⚠️ Cross-agent handoff note (backend owner — task 3?)
`src/app/api/bookings/route.ts` validates `timeSlot: z.string().max(30)`, but the mandated Sunday payload `"07:00 PM (Sunday — by appointment)"` is **34 chars** → Sunday bookings would 400. I kept the payload exactly as the brief mandates (marked "do not change"). **The backend schema needs `max(40)`** (or equivalent) to accept Sunday bookings. Everything else verified compatible: `date` (16 chars ≤ 20 ✓), `service` fallback string ✓, response shape `{success, bookingId, whatsappUrl, persisted?, error?}` ✓, WhatsApp deep-link URL ✓.

## Integration
- Matches `KDentSite.tsx` wiring exactly: `Nav({onReserve})`, `Transformations()`, `Doctor()`, `Reserve()`, `Footer({onReserve})`.
- All five referenced images already exist in `public/kdent/` (verified: doctor-portrait.jpg, smile-before/after-1/2.jpg).
- Shared components consumed as-is: `RevealText`, `FadeIn`, `Eyebrow`, `Magnetic`; data from `@/lib/kdent-data` only.
