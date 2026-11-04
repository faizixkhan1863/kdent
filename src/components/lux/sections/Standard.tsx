"use client";

import { Clock, Gem, ShieldCheck, Star } from "lucide-react";
import EnamelParticles from "../EnamelParticles";
import SplitReveal from "../ui/SplitReveal";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";

const STATS = [
  {
    icon: Star,
    value: "5.0",
    label: "Google rating — 19 verified patient reviews",
  },
  {
    icon: Gem,
    value: "FCPS",
    label: "Oral & Maxillofacial Surgery (PGR) — surgical-grade care",
  },
  {
    icon: ShieldCheck,
    value: "11",
    label: "Signature treatments, all under one roof",
  },
  {
    icon: Clock,
    value: "10–7",
    label: "Mon–Sat clinic hours · Sundays by appointment",
  },
];

const MARQUEE = [
  "Smile Design",
  "Clear Aligners",
  "Dental Implants",
  "Painless RCT",
  "Whitening",
  "Crowns & Bridges",
  "Oral Surgery",
  "Family Dentistry",
];

export default function Standard() {
  return (
    <section id="standard" className="sec-dark relative overflow-hidden" aria-label="The TK Dent standard">
      {/* particle transition */}
      <EnamelParticles className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] w-full [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="lux-container relative pb-20 pt-28 md:pb-28 md:pt-40">
        <Reveal>
          <Eyebrow dark>The TK Dent Standard</Eyebrow>
        </Reveal>

        <h2 className="display-lg mt-8 max-w-5xl text-white">
          <SplitReveal
            text="A smile is architecture — we design it like porcelain, engineer it like surgery, and care for it like art."
            stagger={0.03}
          />
        </h2>

        <div className="hairline-dark mt-16" />

        {/* stats */}
        <div className="mt-14 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.08}>
              <div className="group relative px-2 py-8 sm:px-6">
                <s.icon className="h-5 w-5 text-teal-3 transition-transform duration-700 group-hover:-translate-y-1" aria-hidden="true" />
                <div className="font-display mt-5 text-6xl leading-none text-white md:text-7xl">
                  {s.value}
                </div>
                <p className="mt-4 max-w-[26ch] text-sm leading-relaxed text-[rgba(222,242,238,0.55)]">
                  {s.label}
                </p>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-teal-3 to-transparent transition-transform duration-700 group-hover:scale-x-100"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* marquee */}
      <div className="marquee border-y border-white/5 py-5" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-14">
              <span className="font-display text-2xl italic text-[rgba(222,242,238,0.4)] md:text-3xl">
                {item}
              </span>
              <span className="h-1.5 w-1.5 rotate-45 bg-teal-3/70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
