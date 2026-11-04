"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, MoveRight } from "lucide-react";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";
import { scrollState, scrollToId, prefersReducedMotion } from "../lib/scroll";

const PANELS = [
  {
    src: "/kdent/clinic-suite.jpg",
    num: "01",
    title: "The Treatment Suite",
    copy: "A single-patient operatory washed in daylight — quiet, private, unhurried.",
  },
  {
    src: "/kdent/reception-lounge.jpg",
    num: "02",
    title: "The Lounge",
    copy: "Porcelain, oak and calm. The wait feels nothing like a clinic.",
  },
  {
    src: "/kdent/sterilization-bay.jpg",
    num: "03",
    title: "The Sterile Core",
    copy: "Hospital-grade sterilization — sealed, tracked and displayed with pride.",
  },
  {
    src: "/kdent/consult-room.jpg",
    num: "04",
    title: "The Consult Room",
    copy: "Digital scans and smile previews before any instrument is picked up.",
  },
];

export default function Tour() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    gsap.registerPlugin(ScrollTrigger);
    if (prefersReducedMotion()) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() + window.innerHeight * 0.35}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrollState.tour = self.progress;
            if (barRef.current) {
              barRef.current.style.transform = `scaleX(${self.progress})`;
            }
          },
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="clinic"
      className="relative overflow-hidden bg-porcelain-2"
      aria-label="A tour of the TK Dent clinic"
    >
      <div className="lux-container flex min-h-[100svh] flex-col justify-center py-24 lg:py-0">
        {/* progress bar */}
        <div className="mb-10 hidden h-px w-full bg-ink/10 lg:block" aria-hidden="true">
          <div ref={barRef} className="h-px origin-left scale-x-0 bg-teal" />
        </div>

        {/* desktop horizontal track */}
        <div className="hidden lg:block">
          <div ref={trackRef} className="flex w-max items-stretch gap-10 pr-[8vw]">
            {/* intro panel */}
            <div className="flex w-[34vw] shrink-0 flex-col justify-center pr-6">
              <Eyebrow>The Clinic</Eyebrow>
              <h2 className="display-lg mt-6 text-ink">
                Step inside
                <br />
                <span className="serif-accent">the suite.</span>
              </h2>
              <p className="body-lux mt-6 max-w-sm">
                Designed like a spa, sterilized like an operating room. Four spaces, one
                obsession — your comfort.
              </p>
              <button
                onClick={() => scrollToId("#services")}
                className="mt-8 inline-flex w-fit items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-teal transition-colors hover:text-teal-2"
              >
                Continue scrolling
                <MoveRight className="h-4 w-4" />
              </button>
            </div>

            {PANELS.map((p) => (
              <figure key={p.num} className="group w-[56vw] max-w-[880px] shrink-0" data-cursor>
                <div className="lux-frame relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={p.src}
                    alt={`${p.title} at TK Dent Dental & Aesthetic Care`}
                    fill
                    sizes="(min-width: 1024px) 56vw, 100vw"
                    className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />
                  <span className="kd-chip-light absolute left-6 top-6">TK Dent · {p.num}</span>
                </div>
                <figcaption className="mt-6 flex items-baseline justify-between gap-8">
                  <div>
                    <div className="ghost-numeral text-5xl">{p.num}</div>
                    <h3 className="font-display mt-2 text-3xl text-ink">{p.title}</h3>
                  </div>
                  <p className="max-w-[30ch] pb-1 text-sm leading-relaxed text-muted-ink">{p.copy}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* mobile / tablet stacked */}
        <div className="lg:hidden">
          <Reveal>
            <Eyebrow>The Clinic</Eyebrow>
            <h2 className="display-lg mt-6 text-ink">
              Step inside <span className="serif-accent">the suite.</span>
            </h2>
            <p className="body-lux mt-5 max-w-md">
              Designed like a spa, sterilized like an operating room. Four spaces, one
              obsession — your comfort.
            </p>
          </Reveal>
          <div className="mt-12 space-y-10">
            {PANELS.map((p, i) => (
              <Reveal key={p.num} delay={i * 0.04}>
                <figure>
                  <div className="lux-frame relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={p.src}
                      alt={`${p.title} at TK Dent Dental & Aesthetic Care`}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                    <span className="kd-chip-light absolute left-5 top-5">TK Dent · {p.num}</span>
                  </div>
                  <figcaption className="mt-4">
                    <h3 className="font-display text-2xl text-ink">
                      <span className="ghost-numeral mr-3 text-2xl">{p.num}</span>
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-ink">{p.copy}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12">
            <button onClick={() => scrollToId("#services")} className="btn-ghost-ink">
              See treatments
              <ArrowRight className="h-4 w-4" />
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
