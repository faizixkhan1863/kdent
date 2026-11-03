"use client";

import { BadgeCheck } from "lucide-react";
import CompareSlider from "../ui/CompareSlider";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";
import SplitReveal from "../ui/SplitReveal";

export default function Results() {
  return (
    <section id="results" className="relative overflow-hidden bg-porcelain-2" aria-label="Before and after results">
      <div className="lux-container py-24 md:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow center>Results</Eyebrow>
          </Reveal>
          <h2 className="display-lg mt-7 text-ink">
            <SplitReveal text="Proof, not promises." stagger={0.05} />
          </h2>
          <p className="body-lux mt-5">
            Drag the handle and watch enamel come back to life — the kind of transformation
            modern cosmetic dentistry makes routine.
          </p>
        </div>

        {/* hero comparison */}
        <Reveal className="mt-14">
          <CompareSlider
            before="/kdent/smile-before-1.jpg"
            after="/kdent/smile-after-1.jpg"
            alt="Smile whitening and design transformation"
            className="lux-frame aspect-[4/3] w-full md:aspect-[16/9]"
          />
          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-muted-ink">
            Whitening &amp; smile design — representative result
          </p>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          {/* second comparison */}
          <Reveal>
            <CompareSlider
              before="/kdent/smile-before-2.jpg"
              after="/kdent/smile-after-2.jpg"
              alt="Smile makeover close-up"
              className="lux-frame aspect-[4/3] w-full"
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-muted-ink">
              Veneer-ready smile makeover
            </p>
          </Reveal>

          {/* review summary card */}
          <Reveal delay={0.1}>
            <div className="lux-card flex h-full flex-col justify-between p-8 md:p-10">
              <div>
                <div className="flex items-center gap-2 text-teal" aria-label="Rated 5.0 out of 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-xl" aria-hidden="true">
                      ★
                    </span>
                  ))}
                </div>
                <p className="font-display mt-6 text-3xl leading-snug text-ink md:text-4xl">
                  &ldquo;Painless, professional,
                  <span className="serif-accent"> premium.</span>&rdquo;
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-ink">
                  The words our patients use most. Every one of our 19 Google reviews rates K
                  Dent a perfect five — for gentle hands, honest advice and results that last.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3 border-t border-ink/10 pt-6 text-sm text-muted-ink">
                <BadgeCheck className="h-5 w-5 text-teal" aria-hidden="true" />
                5.0 ★ · 19 verified Google reviews · Bani Gala, Islamabad
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
