'use client';

import { useEffect, useState } from 'react';
import { Phone, Star } from 'lucide-react';

export default function Nav({ onBook }: { onBook: () => void }) {
  // start aligned with SSR (false); correct after mount to avoid hydration mismatch
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // catch late scroll-restoration
    const t1 = setTimeout(onScroll, 250);
    const t2 = setTimeout(onScroll, 1200);
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const links = [
    { href: '#care', label: 'Care' },
    { href: '#clinic', label: 'Clinic' },
    { href: '#services', label: 'Services' },
    { href: '#results', label: 'Results' },
    { href: '#doctor', label: 'Doctor' },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled ? 'kd-nav kd-nav-scrolled' : 'kd-nav'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="K Dent home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] font-bold text-[#F0FFD4] shadow-md ring-1 ring-white/10 transition-transform group-hover:scale-105">
            K
          </span>
          <span className={`font-semibold tracking-tight transition-colors ${scrolled ? 'text-[#0F172A]' : 'text-white'}`}>
            K Dent
            <span className={`ml-2 hidden text-xs font-normal sm:inline ${scrolled ? 'text-slate-500' : 'text-white/60'}`}>
              Dental & Aesthetic Care
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                scrolled
                  ? 'text-slate-600 hover:bg-slate-900/5 hover:text-[#0F172A]'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="tel:+923325855589"
            className={`hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-all sm:flex ${
              scrolled
                ? 'bg-white/70 text-[#0F172A] ring-slate-900/10 hover:bg-white'
                : 'bg-white/10 text-white ring-white/20 backdrop-blur hover:bg-white/20'
            }`}
            aria-label="Call K Dent at 0332 5855589"
          >
            <Phone className="h-3.5 w-3.5" />
            0332 5855589
          </a>
          <button
            onClick={onBook}
            className="flex items-center gap-1.5 rounded-full bg-[#F0FFD4] px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-lg shadow-lime-200/30 ring-1 ring-lime-900/10 transition-all hover:shadow-lime-200/50"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            Book Visit
          </button>
        </div>
      </nav>
    </header>
  );
}
