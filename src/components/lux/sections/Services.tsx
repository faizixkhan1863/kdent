"use client";

import {
  Anchor,
  Crown,
  Gem,
  HeartHandshake,
  Sparkles,
  Stethoscope,
  Scan,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";
import SplitReveal from "../ui/SplitReveal";
import { scrollToId } from "../lib/scroll";

const SERVICES = [
  {
    icon: Gem,
    name: "Smile Design & Veneers",
    copy: "Digitally previewed, hand-finished smile makeovers shaped around your face.",
    price: "On consultation",
  },
  {
    icon: Scan,
    name: "Clear Aligners & Braces",
    copy: "Invisible aligners and metal braces — straightening planned to the millimetre.",
    price: "Plans from Rs. 5,000",
  },
  {
    icon: Anchor,
    name: "Dental Implants",
    copy: "Titanium roots placed by an FCPS oral & maxillofacial surgeon. Built to last decades.",
    price: "On consultation",
  },
  {
    icon: Zap,
    name: "Painless Root Canal",
    copy: "Single-visit endodontics with microscope-grade precision and genuine gentleness.",
    price: "C-Endo certified",
  },
  {
    icon: Stethoscope,
    name: "Oral & Maxillofacial Surgery",
    copy: "Wisdom teeth, extractions and corrective procedures in expert hands.",
    price: "FCPS (PGR) led",
  },
  {
    icon: Crown,
    name: "Crowns & Bridges",
    copy: "Porcelain restorations colour-matched so precisely they disappear into your smile.",
    price: "On consultation",
  },
  {
    icon: Sparkles,
    name: "Whitening & Polish",
    copy: "In-clinic brightening plus scaling and polishing for that just-polished gleam.",
    price: "Rs. 15,000 · couple sessions",
  },
  {
    icon: HeartHandshake,
    name: "General & Family Dentistry",
    copy: "Checkups, fillings and everyday care for every member of the family.",
    price: "Gentle by default",
  },
];

export default function Services() {
  return (
    <section id="services" className="sec-porcelain relative overflow-hidden" aria-label="Treatments at K Dent">
      <div className="lux-container py-24 md:py-36">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
          {/* sticky intro */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <Eyebrow>Treatments</Eyebrow>
            </Reveal>
            <h2 className="display-lg mt-7 text-ink">
              <SplitReveal text="Everything your smile needs. One roof." stagger={0.035} />
            </h2>
            <p className="body-lux mt-6 max-w-md">
              From six-month checkups to full smile makeovers — every treatment planned
              digitally, delivered gently, and priced honestly.
            </p>
            <Reveal delay={0.15} className="mt-8">
              <div className="lux-card p-6">
                <p className="font-display text-xl italic text-teal-2">Seasonal offers</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-ink">
                  Eid promotions and couple whitening packages run through the year — ask us on
                  WhatsApp before your visit.
                </p>
                <button
                  onClick={() => scrollToId("#book")}
                  className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-teal transition-colors hover:text-teal-2"
                >
                  Claim your slot <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </Reveal>
          </div>

          {/* rows */}
          <div>
            {SERVICES.map((s, i) => (
              <Reveal key={s.name} delay={Math.min(i * 0.05, 0.3)}>
                <div
                  className="group relative cursor-pointer overflow-hidden border-t border-ink/10 py-7 transition-colors duration-500 last:border-b hover:border-teal/30 md:py-8"
                  onClick={() => scrollToId("#book")}
                  data-cursor
                >
                  {/* hover sweep */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-r from-mint/80 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
                  />
                  <div className="relative flex items-start gap-5 md:gap-8">
                    <span className="ghost-numeral w-12 shrink-0 pt-1 text-3xl md:text-4xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-display text-2xl text-ink transition-transform duration-500 group-hover:translate-x-1 md:text-[2rem]">
                          {s.name}
                        </h3>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/12 bg-white/70 transition-all duration-500 group-hover:border-teal group-hover:bg-teal group-hover:text-white">
                          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
                        </span>
                      </div>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-ink md:text-[15px]">
                        {s.copy}
                      </p>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em] text-teal">
                        {s.price}
                      </p>
                    </div>
                    <s.icon
                      className="mt-1 hidden h-6 w-6 shrink-0 text-teal/50 transition-colors duration-500 group-hover:text-teal sm:block"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
