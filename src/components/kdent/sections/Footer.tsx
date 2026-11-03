'use client';

import { Star } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#0B1120] px-5 pb-10 pt-16 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-8 border-t border-white/10 pt-10 md:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FFD4] font-bold text-[#0F172A]">
            K
          </span>
          <div>
            <p className="font-semibold tracking-tight">K Dent Dental & Aesthetic Care</p>
            <p className="text-xs text-white/50">Where modern dentistry meets trusted care.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/60">
          <Star className="h-3.5 w-3.5 fill-[#F0FFD4] text-[#F0FFD4]" />
          5.0 · 19 reviews · Shop G-7, Farhan Heights, Bani Gala, Islamabad
        </div>

        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} K Dent. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
