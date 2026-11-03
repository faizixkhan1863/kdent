"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import Eyebrow from "../ui/Eyebrow";
import Reveal from "../ui/Reveal";
import SplitReveal from "../ui/SplitReveal";

const SERVICES = [
  "General Checkup",
  "Smile Design & Veneers",
  "Clear Aligners",
  "Metal Braces",
  "Dental Implants",
  "Root Canal (RCT)",
  "Oral Surgery / Extraction",
  "Crowns & Bridges",
  "Whitening & Polish",
  "Scaling",
  "Fillings",
];

const TIME_SLOTS = ["10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM"];

type BookingResult = {
  bookingId: string;
  whatsappUrl: string;
  persisted: boolean;
};

export default function Book() {
  // Computed post-mount so SSR and client always agree (timezone-safe).
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
  }, []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !service || !date || !timeSlot) {
      setError("Please fill in your name, phone, treatment, date and time.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, service, date, timeSlot, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Booking failed. Please call 0332 5855589.");
      }
      setResult(data as BookingResult);
      setStatus("success");
      // Take the patient straight to the clinic's WhatsApp.
      window.open(data.whatsappUrl, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <section id="book" className="sec-dark relative overflow-hidden" aria-label="Book an appointment">
      {/* décor */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="lux-spin-slow absolute right-[-12%] top-[-10%] h-[36rem] w-[36rem] rounded-full border border-teal-3/15" />
        <div className="absolute bottom-[-20%] left-[-6%] h-[28rem] w-[28rem] rounded-full bg-teal/20 blur-3xl" />
      </div>

      <div className="lux-container relative py-24 md:py-36">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* left — copy + contact */}
          <div>
            <Reveal>
              <Eyebrow dark>Reserve</Eyebrow>
            </Reveal>
            <h2 className="display-lg mt-7 text-white">
              <SplitReveal text="Your chair is waiting." stagger={0.05} />
            </h2>
            <p className="body-lux mt-6 max-w-lg !text-[rgba(222,242,238,0.66)]">
              Tell us what you need — our team confirms your slot on WhatsApp within minutes
              during clinic hours. No queues, no waiting rooms full of people.
            </p>

            <div className="mt-10 space-y-4">
              <a
                href="https://wa.me/923325855589"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all duration-500 hover:border-teal-3/50 hover:bg-white/[0.06]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal/20 text-teal-3 transition-colors group-hover:bg-teal group-hover:text-white">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-[rgba(222,242,238,0.45)]">
                    WhatsApp
                  </span>
                  <span className="text-[15px] font-semibold text-white">0332 5855589</span>
                </span>
              </a>
              <a
                href="tel:+923325855589"
                className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all duration-500 hover:border-teal-3/50 hover:bg-white/[0.06]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal/20 text-teal-3 transition-colors group-hover:bg-teal group-hover:text-white">
                  <Phone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-[rgba(222,242,238,0.45)]">
                    Call the clinic
                  </span>
                  <span className="text-[15px] font-semibold text-white">+92 332 5855589</span>
                </span>
              </a>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/20 text-teal-3">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span className="text-[13px] leading-snug text-[rgba(222,242,238,0.75)]">
                    Shop G-7, Farhan Heights,
                    <br />
                    Jinnah Road, Bani Gala
                  </span>
                </div>
                <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/20 text-teal-3">
                    <Clock className="h-5 w-5" />
                  </span>
                  <span className="text-[13px] leading-snug text-[rgba(222,242,238,0.75)]">
                    Mon–Sat · 10 AM – 7 PM
                    <br />
                    Sunday by appointment
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* right — form / success */}
          <Reveal delay={0.1}>
            <div className="glass-dark p-7 md:p-9">
              {status === "success" && result ? (
                <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-teal/20 text-teal-3">
                    <CheckCircle2 className="h-8 w-8" />
                  </span>
                  <h3 className="font-display mt-6 text-3xl text-white">Request received</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[rgba(222,242,238,0.6)]">
                    Your booking reference is{" "}
                    <strong className="text-mint-glow">
                      #{result.bookingId.slice(-6).toUpperCase()}
                    </strong>
                    . Tap below to open WhatsApp with your details pre-filled — our team will
                    confirm your slot right away.
                  </p>
                  <a href={result.whatsappUrl} target="_blank" rel="noreferrer" className="btn-teal mt-8">
                    <MessageCircle className="h-4 w-4" />
                    Open WhatsApp
                  </a>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setResult(null);
                      setName("");
                      setPhone("");
                      setService("");
                      setDate("");
                      setTimeSlot("");
                      setNotes("");
                    }}
                    className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[rgba(222,242,238,0.45)] transition-colors hover:text-white"
                  >
                    Book another visit
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-teal-3" aria-hidden="true" />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-mint-glow">
                      Appointment request
                    </h3>
                  </div>

                  <div className="mt-7 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        className="lux-input"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        aria-label="Full name"
                        maxLength={80}
                      />
                      <input
                        className="lux-input"
                        placeholder="Phone / WhatsApp"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                        aria-label="Phone or WhatsApp number"
                        maxLength={20}
                      />
                    </div>

                    <div className="relative">
                      <select
                        className="lux-input w-full cursor-pointer appearance-none pr-10"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        aria-label="Select treatment"
                      >
                        <option value="" disabled className="bg-[#0b3a3e]">
                          Which treatment do you need?
                        </option>
                        {SERVICES.map((s) => (
                          <option key={s} value={s} className="bg-[#0b3a3e] text-[#eafaf6]">
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(222,242,238,0.5)]"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        className="lux-input"
                        type="date"
                        min={today}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        aria-label="Preferred date"
                      />
                      <div className="flex items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(222,242,238,0.45)]">
                        {date ? "Pick a time below" : "Pick a date first"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred time">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTimeSlot(slot)}
                          aria-pressed={timeSlot === slot}
                          className={`lux-chip ${timeSlot === slot ? "lux-chip-active" : ""}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="lux-input min-h-24 resize-none"
                      placeholder="Anything we should know? (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={500}
                      aria-label="Additional notes"
                    />

                    {status === "error" && error ? (
                      <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </p>
                    ) : null}

                    <button type="submit" disabled={status === "submitting"} className="btn-teal w-full disabled:opacity-70">
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          Confirm on WhatsApp
                        </>
                      )}
                    </button>

                    <p className="text-center text-[11px] leading-relaxed text-[rgba(222,242,238,0.4)]">
                      No advance payment. Your request goes directly to the clinic — we confirm
                      personally on WhatsApp.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
