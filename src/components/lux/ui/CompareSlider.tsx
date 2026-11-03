"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronsLeftRight } from "lucide-react";

type CompareSliderProps = {
  before: string;
  after: string;
  alt: string;
  className?: string;
  sizes?: string;
};

/** Accessible before/after drag-comparison slider. */
export default function CompareSlider({
  before,
  after,
  alt,
  className = "",
  sizes = "(min-width: 1024px) 80vw, 100vw",
}: CompareSliderProps) {
  const [pos, setPos] = useState(50);

  return (
    <div
      className={`group relative touch-none select-none overflow-hidden ${className}`}
      data-cursor
    >
      {/* after (base layer) */}
      <Image src={after} alt={`${alt} — after treatment`} fill sizes={sizes} className="object-cover" />

      {/* before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={`${alt} — before treatment`} fill sizes={sizes} className="object-cover" />
      </div>

      {/* handle */}
      <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${pos}%` }} aria-hidden="true">
        <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-white/95 shadow-[0_0_20px_rgba(0,0,0,0.35)]" />
        <div className="absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-teal/40 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 group-active:scale-95">
          <ChevronsLeftRight className="h-5 w-5 text-teal-2" />
        </div>
      </div>

      {/* labels */}
      <span className="kd-chip-light absolute left-4 top-4 z-10">Before</span>
      <span className="kd-chip-light absolute right-4 top-4 z-10 !bg-teal/90 !text-white">
        After
      </span>

      {/* a11y control */}
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Compare ${alt} — before and after`}
        className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
