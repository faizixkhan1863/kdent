'use client';

import { useCallback, useEffect, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { CLINIC, NAV_LINKS } from '@/lib/kdent-data';
import Magnetic from '@/components/kdent/ui/Magnetic';

/* ------------------------------------------------------------------
   Nav — fixed maison header. Transparent over the hero, condenses
   into a blurred ink bar past 40px of scroll. Lenis-aware anchors.
------------------------------------------------------------------- */

interface LenisLike {
  scrollTo: (target: string | number, options?: { duration?: number }) => void;
}

function getLenis(): LenisLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __lenis?: LenisLike }).__lenis;
}

export function smoothScroll(href: string): void {
  const lenis = getLenis();
  if (href === '#top') {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (lenis) lenis.scrollTo(href, { duration: 1.6 });
  else document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Nav({ onReserve }: { onReserve: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Escape closes the mobile atelier menu */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleAnchor = useCallback((href: string) => {
    setOpen(false);
    /* let the overlay begin its exit before the glide */
    window.setTimeout(() => smoothScroll(href), open ? 220 : 0);
  }, [open]);

  const handleReserve = useCallback(() => {
    setOpen(false);
    window.setTimeout(onReserve, open ? 220 : 0);
  }, [onReserve, open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
          scrolled
            ? 'border-b border-[rgba(198,161,91,0.14)] bg-[rgba(10,9,8,0.82)] py-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent py-6'
        }`}
      >
        <div className="lux-container flex items-center justify-between">
          {/* ---- brand ---- */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleAnchor('#top');
            }}
            className="group inline-flex min-h-[44px] flex-col justify-center"
            aria-label="K Dent — back to top"
          >
            <span className="font-display text-2xl leading-none text-[var(--ivory)] transition-colors duration-500 group-hover:text-[var(--gold-2)]">
              K Dent
            </span>
            <span className="mt-1 block text-[8.5px] uppercase tracking-[0.4em] text-[var(--gold)]">
              Dental &amp; Aesthetic Atelier
            </span>
          </a>

          {/* ---- center links ---- */}
          <nav className="hidden items-center gap-10 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleAnchor(link.href);
                }}
                className="group relative text-[10.5px] uppercase tracking-[0.28em] text-[var(--ivory-muted)] transition-colors duration-500 hover:text-[var(--gold-2)]"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--gold)] transition-transform duration-500 group-hover:scale-x-100"
                />
              </a>
            ))}
          </nav>

          {/* ---- right cluster ---- */}
          <div className="flex items-center gap-6">
            <a
              href={CLINIC.telUrl}
              className="hidden items-center gap-2 text-xs tracking-[0.14em] text-[var(--ivory-muted)] transition-colors duration-500 hover:text-[var(--gold-2)] md:inline-flex"
              aria-label={`Call the clinic on ${CLINIC.phoneDisplay}`}
            >
              <Phone size={13} className="text-[var(--gold)]" aria-hidden="true" />
              {CLINIC.phoneDisplay}
            </a>

            <span className="hidden sm:inline-block">
              <Magnetic>
                <button
                  type="button"
                  onClick={onReserve}
                  className="btn-gold min-h-[42px]! px-6! text-[10.5px]!"
                >
                  Reserve
                </button>
              </Magnetic>
            </span>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(198,161,91,0.25)] text-[var(--ivory)] transition-colors duration-500 hover:border-[rgba(198,161,91,0.6)] hover:text-[var(--gold-2)] lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="kdent-mobile-menu"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ---- mobile atelier menu ---- */}
      <div
        id="kdent-mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-0 z-[60] flex flex-col bg-[rgba(10,9,8,0.96)] backdrop-blur-xl transition-all duration-500 lg:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="lux-container flex items-center justify-between py-6">
          <span className="font-display text-2xl leading-none text-[var(--ivory)]">K Dent</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(198,161,91,0.25)] text-[var(--ivory)] transition-colors duration-500 hover:border-[rgba(198,161,91,0.6)] hover:text-[var(--gold-2)]"
            aria-label="Close menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav
          className="lux-container flex flex-1 flex-col items-center justify-center gap-7"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                handleAnchor(link.href);
              }}
              style={{ transitionDelay: open ? `${140 + i * 80}ms` : '0ms' }}
              className={`font-display text-4xl text-[var(--ivory)] transition-all duration-700 hover:text-[var(--gold-2)] ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lux-container flex flex-col items-center gap-5 pb-12">
          <a
            href={CLINIC.telUrl}
            tabIndex={open ? 0 : -1}
            style={{ transitionDelay: open ? '540ms' : '0ms' }}
            className={`inline-flex min-h-[44px] items-center gap-2 text-xs tracking-[0.14em] text-[var(--ivory-muted)] transition-all duration-700 hover:text-[var(--gold-2)] ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <Phone size={13} className="text-[var(--gold)]" aria-hidden="true" />
            {CLINIC.phoneDisplay}
          </a>
          {/* the fade lives on a wrapper — .btn-gold owns the button's own transitions */}
          <div
            style={{ transitionDelay: open ? '620ms' : '0ms' }}
            className={`transition-all duration-700 ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={handleReserve}
              className="btn-gold min-h-[46px]! px-8! text-[11px]!"
            >
              Reserve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
