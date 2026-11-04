"use client";

import { Clock, Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { scrollToId } from "./lib/scroll";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="sec-dark mt-auto border-t border-white/5">
      <div className="lux-container py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="font-display text-5xl leading-none text-white md:text-6xl">
              TK<span className="text-teal-3">·</span>Dent
            </div>
            <p className="serif-accent-dark mt-3 text-lg">Where modern dentistry meets trusted care.</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[rgba(222,242,238,0.55)]">
              A boutique dental &amp; aesthetic studio in Bani Gala, Islamabad — surgical precision,
              spa-calm comfort.
            </p>
          </div>

          {/* Visit */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.32em] text-mint-glow">Visit</h3>
            <ul className="mt-5 space-y-3 text-sm text-[rgba(222,242,238,0.66)]">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-3" />
                <span>
                  House 34-C, Akram Road,
                  <br />
                  Bani Gala,
                  <br />
                  Islamabad
                </span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.32em] text-mint-glow">Hours</h3>
            <ul className="mt-5 space-y-3 text-sm text-[rgba(222,242,238,0.66)]">
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-3" />
                <span>
                  Mon – Sat
                  <br />
                  10:00 AM – 7:00 PM
                </span>
              </li>
              <li className="text-[rgba(222,242,238,0.45)]">Sunday · by appointment</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.32em] text-mint-glow">Contact</h3>
            <ul className="mt-5 space-y-3 text-sm text-[rgba(222,242,238,0.66)]">
              <li>
                <a
                  href="https://wa.me/923123329479"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-teal-3" /> 0312 3329479
                </a>
              </li>
              <li>
                <a href="tel:+923123329479" className="flex items-center gap-3 transition-colors hover:text-white">
                  <Phone className="h-4 w-4 text-teal-3" /> +92 312 3329479
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/TK_dent_care"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Instagram className="h-4 w-4 text-teal-3" /> @TK_dent_care
                </a>
              </li>
              <li>
                <button
                  onClick={() => scrollToId("#book")}
                  className="flex items-center gap-3 text-mint-glow transition-colors hover:text-white"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-3" /> Reserve a visit
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline-dark mt-14" />
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-[rgba(222,242,238,0.35)] md:flex-row md:items-center">
          <span>© {year} TK Dent Dental &amp; Aesthetic Care</span>
          <span>
            Website by{" "}
            <a
              href="https://synkew.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[rgba(222,242,238,0.6)] transition-colors hover:text-white"
            >
              Synkew
            </a>
          </span>
          <span>Dr. Tanveer Khokhar · PMDC 717175-03-D</span>
        </div>
      </div>
    </footer>
  );
}
