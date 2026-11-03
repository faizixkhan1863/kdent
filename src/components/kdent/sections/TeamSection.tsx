'use client';

import { useEffect, useRef, useState } from 'react';
import { Award, GraduationCap, ShieldCheck, UserPlus } from 'lucide-react';
import SplitText from '../ui/SplitText';

/**
 * PHASE 6 — MEET THE ARCHITECTS
 * High-fashion editorial portrait with holographic framing and an
 * interactive depth shift on hover.
 */
export default function TeamSection() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: py * -8, y: px * 10 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const credentials = [
    { icon: GraduationCap, label: 'BDS', detail: 'Khyber Medical University (KMU)' },
    { icon: ShieldCheck, label: 'RDS (Pak)', detail: 'Registered Dental Surgeon, Pakistan' },
    { icon: Award, label: 'FCPS (PGR)', detail: 'Oral & Maxillofacial Surgery — in training' },
    { icon: Award, label: 'C-Endo (Isb)', detail: 'Certificate in Endodontics, Islamabad' },
  ];

  return (
    <section
      id="doctor"
      data-kd-phase="team"
      className="relative flex min-h-[140vh] items-center px-5 py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* holographic portrait */}
        <div ref={wrapRef} className="kd-fade relative mx-auto w-full max-w-md">
          <div
            className="kd-holo-frame relative"
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 120ms linear',
            }}
          >
            <div className="kd-holo-scan" />
            <div className="relative overflow-hidden rounded-[28px] ring-1 ring-white/40">
              <img
                src="/kdent/doctor-portrait.jpg"
                alt="Dr. Yasir Arafat — Principal Dental Surgeon at K Dent"
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
              />
              <div className="kd-holo-glare absolute inset-0" />
            </div>
            {/* floating nameplate */}
            <div className="absolute -bottom-6 left-1/2 w-[86%] -translate-x-1/2 rounded-2xl bg-white/85 p-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.4)] ring-1 ring-[#0F172A]/10 backdrop-blur-xl">
              <p className="vel-type text-lg font-bold text-[#0F172A]">Dr. Yasir Arafat</p>
              <p className="text-xs font-medium text-slate-500">
                Founder & Principal Dental Surgeon · PMDC # 717176-03-D
              </p>
            </div>
          </div>
          <p className="mt-10 text-center text-[11px] text-slate-400">
            *Portrait placeholder — studio photograph to be swapped by the clinic.
          </p>
        </div>

        {/* credentials */}
        <div>
          <span className="kd-fade inline-flex items-center gap-2 rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#334155] ring-1 ring-[#0F172A]/10">
            Meet the architect
          </span>
          <SplitText
            text="The hands behind the smiles."
            className="vel-type mt-5 text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-5xl"
          />
          <p className="kd-fade mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Every treatment at K Dent is planned and supervised by a surgeon whose
            training spans general dentistry, endodontics and FCPS-level oral &
            maxillofacial surgery. Precise. Personal. Accountable.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {credentials.map((c, i) => (
              <div
                key={c.label}
                className="kd-fade kd-glass-card flex items-start gap-3 p-4"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-[#F0FFD4]">
                  <c.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">{c.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* team expanding card */}
          <div className="kd-fade mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-[#0F172A]/20 bg-white/50 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FFD4] text-[#0F172A]">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">The team is growing</p>
                <p className="text-xs text-slate-500">
                  K Dent is onboarding associate dentists (male & female) — join the studio.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/923325855589?text=Assalamualaikum!%20I%20would%20like%20to%20apply%20for%20the%20dentist%20position%20at%20K%20Dent."
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              Apply via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
