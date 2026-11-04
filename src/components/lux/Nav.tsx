"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Phone } from "lucide-react";
import { scrollToId } from "./lib/scroll";

const LINKS = [
  { label: "Standard", href: "#standard" },
  { label: "Clinic", href: "#clinic" },
  { label: "Treatments", href: "#services" },
  { label: "Results", href: "#results" },
  { label: "Doctor", href: "#doctor" },
];

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 500 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[90] transition-transform duration-700 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="lux-container mt-4 flex items-center justify-between md:mt-5">
        {/* Brand */}
        <button
          onClick={() => scrollToId("#hero")}
          className="group flex items-baseline gap-2 rounded-full px-2 py-1"
          aria-label="TK Dent — back to top"
        >
          <span className="font-display text-2xl leading-none text-ink transition-colors group-hover:text-teal md:text-[1.7rem]">
            TK<span className="text-teal">·</span>Dent
          </span>
          <span className="hidden text-[9px] font-semibold uppercase tracking-[0.32em] text-muted-ink sm:inline">
            Dental &amp; Aesthetic
          </span>
        </button>

        {/* Links */}
        <nav
          aria-label="Primary"
          className={`hidden items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-xl transition-all duration-700 lg:flex ${
            scrolled
              ? "border-ink/10 bg-white/75 shadow-[0_20px_50px_-30px_rgba(7,39,43,0.4)]"
              : "border-transparent bg-white/40"
          }`}
        >
          {LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollToId(l.href)}
              className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70 transition-all duration-500 hover:bg-mint hover:text-teal-2"
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="tel:+923123329479"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-ink/12 bg-white/60 backdrop-blur-xl transition-all duration-500 hover:border-teal/60 hover:text-teal md:flex"
            aria-label="Call TK Dent — 0312 3329479"
          >
            <Phone className="h-4 w-4" />
          </a>
          <button onClick={() => scrollToId("#book")} className="btn-teal !min-h-[44px] !px-6 text-[10.5px]">
            <CalendarCheck className="h-3.5 w-3.5" />
            Book
          </button>
        </div>
      </div>
    </header>
  );
}
