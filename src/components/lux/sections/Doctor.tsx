"use client";

import { GraduationCap, Instagram, MessageCircle } from "lucide-react";
import Image from "next/image";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";
import SplitReveal from "../ui/SplitReveal";

const CREDENTIALS = [
  { title: "BDS", detail: "Khyber Medical University" },
  { title: "RDS", detail: "Registered Dental Surgeon, Pakistan" },
  { title: "FCPS (PGR)", detail: "Oral & Maxillofacial Surgery" },
  { title: "C-Endo", detail: "Certificate in Endodontics, Islamabad" },
];

export default function Doctor() {
  return (
    <section id="doctor" className="sec-porcelain relative overflow-hidden" aria-label="Meet Dr. Yasir Arafat">
      {/* décor */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="lux-spin-slow absolute left-[-16%] top-[8%] h-[38rem] w-[38rem] rounded-full border border-teal/10" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[26rem] w-[26rem] rounded-full bg-mint/50 blur-3xl" />
      </div>

      <div className="lux-container relative py-24 md:py-36">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* portrait */}
          <Reveal className="relative mx-auto w-full max-w-md lg:mx-0">
            <div aria-hidden="true" className="absolute -left-5 -top-5 h-full w-full rounded-t-[10rem] rounded-b-[2rem] border border-teal/25" />
            <div className="lux-frame relative aspect-[3/4] overflow-hidden rounded-t-[10rem] rounded-b-[2rem]">
              <Image
                src="/kdent/doctor-portrait.jpg"
                alt="Dr. Yasir Arafat — Oral & Maxillofacial Surgeon at K Dent"
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
            </div>
            <div className="lux-card absolute -bottom-6 left-1/2 flex w-[86%] -translate-x-1/2 items-center gap-3 p-4">
              <GraduationCap className="h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
              <div className="text-xs leading-snug text-muted-ink">
                <span className="font-bold text-ink">Dr. Yasir Arafat</span>
                <br />
                FCPS (PGR) · Oral &amp; Maxillofacial Surgery
              </div>
            </div>
          </Reveal>

          {/* bio */}
          <div>
            <Reveal>
              <Eyebrow>The Surgeon</Eyebrow>
            </Reveal>
            <h2 className="display-lg mt-7 text-ink">
              <SplitReveal text="Dr. Yasir Arafat" stagger={0.06} />
            </h2>
            <p className="serif-accent mt-2 text-xl md:text-2xl">
              Oral &amp; Maxillofacial Surgeon · Endodontist
            </p>
            <p className="body-lux mt-6 max-w-xl">
              Great dentistry should feel calm, precise and honest — you&rsquo;ll feel the
              difference within the first ten minutes of your visit. From a simple filling to a
              complex implant, every case at K Dent is personally planned and treated by Dr.
              Yasir.
            </p>

            <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/5 sm:grid-cols-2">
              {CREDENTIALS.map((c) => (
                <div key={c.title} className="bg-white/70 p-5 backdrop-blur">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.25em] text-teal">{c.title}</dt>
                  <dd className="mt-1.5 text-sm text-muted-ink">{c.detail}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-mint/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-2">
              PMDC Registered · 717176-03-D
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="https://wa.me/923325855589?text=Assalamualaikum!%20I%20would%20like%20a%20consultation%20with%20Dr.%20Yasir%20Arafat."
                target="_blank"
                rel="noreferrer"
                className="btn-teal"
              >
                <MessageCircle className="h-4 w-4" />
                Consult on WhatsApp
              </a>
              <a
                href="https://instagram.com/kdent_care"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost-ink"
              >
                <Instagram className="h-4 w-4" />
                @kdent_care
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
