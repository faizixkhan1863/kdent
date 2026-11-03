'use client';

import { Instagram, Phone } from 'lucide-react';
import { CLINIC, MARQUEE_ITEMS, NAV_LINKS } from '@/lib/kdent-data';
import Marquee from './Marquee';

/* ------------------------------------------------------------------
   Footer — the maison's colophon. Marquee ribbon, four-column grid,
   and a whisper-quiet bottom bar. mt-auto pins it to the viewport.
------------------------------------------------------------------- */

interface LenisLike {
  scrollTo: (target: string | number, options?: { duration?: number }) => void;
}

function smoothScroll(href: string): void {
  if (typeof window === 'undefined') return;
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
  if (href === '#top') {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (lenis) lenis.scrollTo(href, { duration: 1.6 });
  else document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
}

const linkClass =
  'inline-flex min-h-[24px] items-center text-xs uppercase tracking-[0.18em] text-[var(--ivory-muted)] transition-colors duration-500 hover:text-[var(--gold-2)] text-left';

const headingClass = 'text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]';

export default function Footer({ onReserve }: { onReserve: () => void }) {
  return (
    <>
      <Marquee items={MARQUEE_ITEMS} />

      <footer className="mt-auto bg-[var(--ink)] pt-20 pb-10 text-[var(--ivory)]">
        <div className="lux-container">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* ---- brand ---- */}
            <div>
              <p className="display-lg font-display">K Dent</p>
              <p className="mt-4 font-display text-lg italic" style={{ color: 'var(--gold-2)' }}>
                {CLINIC.signature}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[var(--ivory-muted)]">
                A private dental &amp; aesthetic atelier — Bani Gala, Islamabad
              </p>
            </div>

            {/* ---- navigate ---- */}
            <nav aria-label="Footer">
              <h3 className={headingClass}>Navigate</h3>
              <ul className="mt-5 space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={linkClass}
                      onClick={(e) => {
                        e.preventDefault();
                        smoothScroll(link.href);
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={onReserve}
                    className={`${linkClass} min-h-[44px] w-full sm:w-auto`}
                  >
                    Reserve a Chair
                  </button>
                </li>
              </ul>
            </nav>

            {/* ---- visit ---- */}
            <div>
              <h3 className={headingClass}>Visit</h3>
              <p className="mt-5 text-xs leading-relaxed text-[var(--ivory-muted)]">
                {CLINIC.address}
              </p>
              <ul className="mt-4 space-y-2">
                {CLINIC.hours.map((h) => (
                  <li key={h.days} className="text-[11px] text-[var(--ivory-muted)]">
                    <span className="text-[var(--ivory)]">{h.days}</span>
                    <span aria-hidden="true"> — </span>
                    <span>{h.time}</span>
                  </li>
                ))}
              </ul>
              <a
                href={CLINIC.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-[24px] items-center text-xs text-[var(--gold-2)] underline decoration-[rgba(198,161,91,0.4)] underline-offset-4 transition-colors duration-500 hover:text-[var(--gold)]"
              >
                Get directions →
              </a>
            </div>

            {/* ---- connect ---- */}
            <div>
              <h3 className={headingClass}>Connect</h3>
              <ul className="mt-5 space-y-3">
                <li>
                  <a
                    href={CLINIC.telUrl}
                    className={linkClass}
                    aria-label={`Call the clinic on ${CLINIC.phoneDisplay}`}
                  >
                    <Phone size={12} className="text-[var(--gold)]" aria-hidden="true" />
                    {CLINIC.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={CLINIC.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    <Instagram size={12} className="text-[var(--gold)]" aria-hidden="true" />
                    {CLINIC.instagram}
                  </a>
                </li>
                <li className="pt-1 text-[11px] leading-relaxed text-[var(--ivory-muted)]">
                  Facebook — {CLINIC.facebookNote}
                </li>
              </ul>
            </div>
          </div>

          <div className="hairline my-12" aria-hidden="true" />

          {/* ---- colophon ---- */}
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[var(--ivory-muted)] sm:text-left">
              © {new Date().getFullYear()} {CLINIC.fullName} — All rights reserved
            </p>
            <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[var(--ivory-muted)] sm:text-right">
              PMDC 717176-03-D · Crafted with precision in Islamabad
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
