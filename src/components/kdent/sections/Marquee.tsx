'use client';

/* ------------------------------------------------------------------
   Marquee — infinite gold-ticked ribbon. Two identical tracks make
   the -50% translate loop seamless. Pure CSS, honours reduced motion.
------------------------------------------------------------------- */

export default function Marquee({ items }: { items: readonly string[] }) {
  const track = (hidden: boolean) => (
    <div className="marquee-track" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="inline-flex items-center gap-14">
          <span className="text-[11px] uppercase tracking-[0.42em] text-[var(--ivory-muted)]">
            {item}
          </span>
          <span className="text-xs text-[var(--gold)]">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="marquee border-y border-[rgba(198,161,91,0.16)] bg-[var(--ink-2)] py-5"
      aria-hidden="true"
    >
      {track(false)}
      {track(true)}
    </div>
  );
}
