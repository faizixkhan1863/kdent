'use client';

import { useEffect, useRef, useState } from 'react';
import { Baby, HeartHandshake, ShieldCheck, Wind } from 'lucide-react';
import SplitText from '../ui/SplitText';

/**
 * PHASE 2 — DETOX & DE-ANXIETY
 * Matte mist air. Floating micro-particles slow to a heartbeat pace.
 * K Dent's philosophy of anxiety-free, gentle, family-friendly care.
 */
export default function DetoxSection() {
  const [breath, setBreath] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    const cycle = setInterval(() => {
      setBreath((b) => (b === 'inhale' ? 'hold' : b === 'hold' ? 'exhale' : 'inhale'));
    }, 2600);
    return () => clearInterval(cycle);
  }, []);

  const cards = [
    {
      icon: HeartHandshake,
      title: 'Gentle by design',
      text: 'Pain-free, patient-first protocols. We move at your pace — never the other way around.',
    },
    {
      icon: ShieldCheck,
      title: 'Strict sterilization',
      text: 'A hygienic, fully sterilized facility with uncompromising instrument protocols.',
    },
    {
      icon: Baby,
      title: 'Family friendly',
      text: 'A comfortable, calming environment built for kids, parents and grandparents alike.',
    },
  ];

  return (
    <section
      id="care"
      data-kd-phase="detox"
      className="relative flex min-h-[130vh] flex-col items-center justify-center px-5 py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="kd-fade flex items-center justify-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#334155] ring-1 ring-[#0F172A]/10">
            <Wind className="h-3.5 w-3.5" /> Breathe in
          </span>
        </div>

        <SplitText
          text="Dentistry without the dread."
          className="vel-type mx-auto mt-6 max-w-4xl text-center text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-6xl"
        />

        <p className="kd-fade mx-auto mt-7 max-w-2xl text-center text-base leading-relaxed text-slate-600 sm:text-lg">
          Most people don&apos;t fear the dentist — they fear the unknown. At K Dent,
          everything is designed to lower your heart rate: transparent explanations,
          gentle techniques and a calm, spa-like studio. Breathe with us.
        </p>

        {/* breathing guide */}
        <div className="kd-fade mt-10 flex items-center justify-center">
          <div className="flex items-center gap-4 rounded-full bg-white/60 px-6 py-3 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.15)] ring-1 ring-[#0F172A]/5 backdrop-blur-md">
            <span className={`kd-breath-dot ${breath === 'inhale' ? 'kd-breath-in' : breath === 'exhale' ? 'kd-breath-out' : ''}`} />
            <span className="w-20 text-center text-sm font-medium capitalize text-slate-700">
              {breath === 'inhale' ? 'Inhale…' : breath === 'hold' ? 'Hold…' : 'Exhale…'}
            </span>
          </div>
        </div>

        {/* philosophy cards */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {cards.map((c, i) => (
            <div
              key={c.title}
              className="kd-fade kd-glass-card group p-6"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <c.icon className="h-6 w-6 text-[#5F7A6A] transition-transform duration-300 group-hover:-translate-y-1" />
              <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
