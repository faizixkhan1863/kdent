'use client';

import { ScanFace, MonitorSmartphone, Syringe, BadgeCheck } from 'lucide-react';
import SplitText from '../ui/SplitText';

/**
 * PHASE 3 — THE 3D ATRIUM
 * The wireframe prints into a photoreal suite behind this copy.
 * Frosted-glass cards dock to the glowing 3D hotspot nodes.
 */
export default function TourSection() {
  const cards = [
    {
      icon: ScanFace,
      node: 'a',
      title: 'Advanced diagnostics',
      text: 'Digital dentistry with advanced diagnostic technology — precision-based planning before any instrument touches a tooth.',
    },
    {
      icon: MonitorSmartphone,
      node: 'b',
      title: 'The treatment suite',
      text: 'A state-of-the-art dental chair studio with modern equipment, tuned for comfort during long procedures like RCTs and implants.',
    },
    {
      icon: Syringe,
      node: 'c',
      title: 'Sterilization bay',
      text: 'Strict sterilization protocols in a hygienic, fully-sterilized facility — the quiet backbone of safe dentistry.',
    },
  ];

  return (
    <section
      id="clinic"
      data-kd-phase="tour"
      className="relative flex min-h-[170vh] flex-col px-5 py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="kd-fade flex justify-center lg:justify-start lg:pl-2">
          <span className="rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#334155] ring-1 ring-[#0F172A]/10">
            The Atrium · 3D Clinic Tour
          </span>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <SplitText
            text="Step inside the studio."
            className="vel-type text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-5xl lg:text-6xl"
          />
          <p className="kd-fade max-w-md self-end text-base leading-relaxed text-slate-600 lg:justify-self-end">
            The wireframe resolves into the real thing. Every glowing node on the
            model is a promise K Dent keeps — hover the cards to see what powers
            each visit.
          </p>
        </div>

        {/* frosted glass hotspot cards — desktop: docked over the 3D room */}
        <div className="relative mt-10 hidden min-h-[54vh] lg:block">
          {cards.map((c) => (
            <article
              key={c.node}
              className={`kd-hotspot kd-hotspot-${c.node} kd-glass-card kd-fade w-80 p-6`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-[#F0FFD4]">
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-[#0F172A]">{c.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.text}</p>
              <BadgeCheck className="kd-hotspot-pulse absolute -right-2 -top-2 h-6 w-6 rounded-full bg-[#F0FFD4] p-0.5 text-[#0F172A] shadow" />
            </article>
          ))}
        </div>

        {/* mobile: stacked cards */}
        <div className="mt-10 grid gap-4 lg:hidden">
          {cards.map((c) => (
            <article key={c.node} className="kd-glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-[#F0FFD4]">
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-[#0F172A]">{c.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
