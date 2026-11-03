'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import SplitText from '../ui/SplitText';
import { SERVICES, useKUI } from '../lib/store';

/**
 * PHASE 4 — AESTHETIC MORPH SHOWCASE
 * Split screen: the crystal morphs on the left (WebGL), the service
 * dossier scrolls on the right. IntersectionObserver drives the morph.
 */
export default function ServicesSection() {
  const listRef = useRef<HTMLDivElement>(null);
  const activeService = useKUI((s) => s.activeService);
  const setActiveService = useKUI((s) => s.setActiveService);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-service-index]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.55) {
            const i = Number((e.target as HTMLElement).dataset.serviceIndex);
            if (!Number.isNaN(i)) setActiveService(i);
          }
        }
      },
      { threshold: [0.55] }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [setActiveService]);

  return (
    <section
      id="services"
      data-kd-phase="services"
      className="relative min-h-[280vh]"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 px-5 py-24 lg:grid-cols-2 lg:gap-10">
        {/* left — the 3D crystal lives in the WebGL canvas behind */}
        <div className="sticky top-0 hidden h-screen items-start pt-[24vh] lg:flex" aria-hidden="true">
          <div className="pointer-events-none select-none pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Now morphing
            </p>
            <p className="kd-morph-label vel-type mt-2 text-2xl font-semibold text-[#0F172A]">
              {SERVICES[activeService]?.title}
            </p>
          </div>
        </div>

        {/* right — the dossier */}
        <div className="w-full">
          <div className="mb-10 lg:pl-6">
            <span className="kd-fade inline-flex items-center gap-2 rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#334155] ring-1 ring-[#0F172A]/10">
              <Sparkles className="h-3.5 w-3.5" /> Services · The Menu
            </span>
            <SplitText
              text="Every service, one roof."
              className="vel-type mt-5 text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-5xl"
            />
            <p className="kd-fade mt-4 max-w-md text-base leading-relaxed text-slate-600">
              From routine check-ups to complete smile makeovers — a full range of
              affordable dental services tailored to your needs.
            </p>
          </div>

          <div ref={listRef} className="flex flex-col gap-5 lg:pl-6">
            {SERVICES.map((s, i) => (
              <article
                key={s.id}
                data-service-index={i}
                className={`kd-service-card kd-fade scroll-mt-24 rounded-3xl p-6 transition-all duration-500 sm:p-7 ${
                  activeService === i
                    ? 'kd-service-active border-[#0F172A]/15 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)]'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {String(i + 1).padStart(2, '0')} — {s.tagline}
                    </p>
                    <h3 className="vel-type mt-1.5 text-2xl font-semibold tracking-tight text-[#0F172A]">
                      {s.title}
                    </h3>
                  </div>
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-white/70"
                    style={{ backgroundColor: s.accent }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                  {s.description}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <li
                      key={p}
                      className="rounded-full bg-[#0F172A]/[0.045] px-3 py-1 text-xs font-medium text-[#334155] ring-1 ring-[#0F172A]/[0.06]"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}

            {/* offers strip */}
            <div className="kd-fade mt-2 rounded-3xl bg-[#0F172A] p-6 text-white sm:p-7">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F0FFD4]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F0FFD4]">
                  Live offers at the clinic
                </h3>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                <li className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-sm font-semibold">Whitening for two</p>
                  <p className="mt-1 text-xs text-white/60">In-house whitening, 2 persons</p>
                  <p className="mt-2 text-lg font-bold">Rs. 15,000</p>
                </li>
                <li className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-sm font-semibold">Braces start</p>
                  <p className="mt-1 text-xs text-white/60">+ 3 free restorations / extractions</p>
                  <p className="mt-2 text-lg font-bold">Rs. 5,000 down</p>
                </li>
                <li className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-sm font-semibold">First consultation</p>
                  <p className="mt-1 text-xs text-white/60">New patients at Bani Gala</p>
                  <p className="mt-2 text-lg font-bold">FREE checkup</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
