'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import { CLINIC, TIME_SLOTS, TREATMENTS } from '@/lib/kdent-data';
import { FadeIn, RevealText } from '@/components/kdent/ui/Reveal';
import Eyebrow from '@/components/kdent/ui/Eyebrow';
import Magnetic from '@/components/kdent/ui/Magnetic';

/* ------------------------------------------------------------------
   Reserve — the booking console. Four quiet steps, one gold button;
   the API answers with a reference and a WhatsApp handshake.
------------------------------------------------------------------- */

interface DayOption {
  iso: string;
  weekday: string;
  day: string;
  month: string;
  isSunday: boolean;
}

interface BookingResponse {
  success: boolean;
  bookingId: string;
  whatsappUrl: string;
  persisted?: boolean;
  error?: string;
}

interface Confirmation {
  refCode: string;
  service: string;
  date: string;
  slot: string;
  waUrl: string;
}

type Status = 'idle' | 'saving' | 'done' | 'error';

const SERVICE_OPTIONS: string[] = [...TREATMENTS.map((t) => t.title), 'Not sure — advise me'];

/* client-only — 14 days starting tomorrow (avoids SSR hydration drift) */
function buildDays(): DayOption[] {
  const out: DayOption[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`,
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.toLocaleDateString('en-US', { day: '2-digit' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isSunday: d.getDay() === 0,
    });
  }
  return out;
}

function StepLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]">{children}</p>
  );
}

export default function Reserve() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [day, setDay] = useState<DayOption | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    setDays(buildDays());
  }, []);

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    day !== null &&
    slot !== null &&
    status !== 'saving' &&
    status !== 'done';

  const reset = () => {
    setDay(null);
    setSlot(null);
    setService(null);
    setName('');
    setPhone('');
    setNotes('');
    setStatus('idle');
    setError(null);
    setConfirmation(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !day || !slot) return;

    setStatus('saving');
    setError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          service: service ?? 'Not sure — advise me',
          date: `${day.weekday}, ${day.day} ${day.month} ${new Date(day.iso).getFullYear()}`,
          timeSlot: day.isSunday ? `${slot} (Sunday — by appointment)` : slot,
          notes: notes || null,
        }),
      });
      const data: BookingResponse = await res.json();

      if (data.success) {
        setStatus('done');
        setConfirmation({
          refCode: String(data.bookingId).slice(-6).toUpperCase(),
          service: service ?? 'Not sure — advise me',
          date: `${day.weekday}, ${day.day} ${day.month}`,
          slot,
          waUrl: data.whatsappUrl,
        });
        try {
          window.open(data.whatsappUrl, '_blank', 'noopener');
        } catch {
          /* popup withheld — the success card carries the link */
        }
      } else {
        setStatus('error');
        setError(data.error || `Something went wrong — please call ${CLINIC.phoneDisplay}.`);
      }
    } catch {
      setStatus('error');
      setError(`Something went wrong — please call ${CLINIC.phoneDisplay}.`);
    }
  };

  return (
    <section
      id="book"
      aria-label="Reserve your chair"
      className="relative bg-[var(--ink-2)] py-28 text-[var(--ivory)] md:py-36"
    >
      {/* ---- header ---- */}
      <div className="lux-container text-center">
        <FadeIn>
          <Eyebrow center>06 — Reservations</Eyebrow>
        </FadeIn>
        <RevealText
          as="h2"
          className="display-lg mx-auto mt-6"
          lines={[
            <>Your chair</>,
            <>
              is <span className="serif-accent">waiting</span>.
            </>,
          ]}
        />
        <FadeIn delay={0.1} className="mx-auto mt-5 max-w-xl">
          <p className="body-lux text-[var(--ivory-muted)]">
            Choose a day and a slot — the clinic confirms on WhatsApp within minutes. Mon–Sat
            10:00 AM – 7:00 PM · Sunday by appointment.
          </p>
        </FadeIn>
      </div>

      {/* ---- the console ---- */}
      <div className="lux-container">
        <FadeIn delay={0.15} className="mt-14">
          <div className="lux-card mx-auto max-w-4xl p-6 sm:p-10">
            {status === 'done' && confirmation ? (
              /* ============ SUCCESS ============ */
              <div className="flex flex-col items-center py-8 text-center" role="status">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-2)]">
                  <CheckCircle2 size={30} color="#0a0908" aria-hidden="true" />
                </div>
                <h3 className="display-md mt-6">Booked. Breathe easy.</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--ivory-muted)]">
                  Reservation{' '}
                  <span className="font-mono font-semibold text-[var(--gold-2)]">
                    #{confirmation.refCode}
                  </span>{' '}
                  — {confirmation.service} · {confirmation.date} · {confirmation.slot}. The clinic
                  will confirm on WhatsApp within minutes.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a href={confirmation.waUrl} target="_blank" rel="noreferrer" className="btn-gold">
                    Confirm on WhatsApp
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <button type="button" onClick={reset} className="btn-ghost-ivory">
                    Book another visit
                  </button>
                </div>
              </div>
            ) : (
              /* ============ FORM ============ */
              <form onSubmit={handleSubmit} noValidate>
                {/* 01 · day */}
                <fieldset>
                  <legend>
                    <StepLabel>01 · Choose your day</StepLabel>
                  </legend>
                  <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="Choose a day">
                    {days.length === 0
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <span
                            key={i}
                            aria-hidden="true"
                            className="h-[64px] min-w-[68px] animate-pulse rounded-xl bg-white/[0.05]"
                          />
                        ))
                      : days.map((d) => {
                          const active = day?.iso === d.iso;
                          return (
                            <button
                              key={d.iso}
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                setDay(d);
                                setError(null);
                              }}
                              className={`lux-chip min-w-[68px] flex-col gap-0.5! py-2.5! ${
                                active ? 'lux-chip-active' : ''
                              }`}
                            >
                              <span
                                className={`text-[9px] uppercase tracking-[0.18em] ${
                                  d.isSunday ? 'opacity-60' : 'opacity-70'
                                }`}
                              >
                                {d.isSunday ? 'Sun·appt' : d.weekday}
                              </span>
                              <span className="font-display text-xl leading-tight">{d.day}</span>
                              <span className="text-[9px] uppercase tracking-[0.18em] opacity-70">
                                {d.month}
                              </span>
                            </button>
                          );
                        })}
                  </div>
                </fieldset>

                {/* 02 · time */}
                <fieldset className="mt-9">
                  <legend>
                    <StepLabel>02 · Choose your time</StepLabel>
                  </legend>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5" role="group" aria-label="Time slots">
                    {day?.isSunday && (
                      <span className="rounded-full bg-[rgba(198,161,91,0.15)] px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[var(--gold-2)]">
                        Sunday — priority appointments only
                      </span>
                    )}
                    {TIME_SLOTS.map((t) => {
                      const active = slot === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setSlot(t);
                            setError(null);
                          }}
                          className={`lux-chip ${active ? 'lux-chip-active' : ''}`}
                        >
                          <Clock size={11} aria-hidden="true" />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 03 · occasion */}
                <fieldset className="mt-9">
                  <legend>
                    <StepLabel>03 · Choose your ritual</StepLabel>
                  </legend>
                  <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="Choose a treatment">
                    {SERVICE_OPTIONS.map((s) => {
                      const active = service === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setService(s);
                            setError(null);
                          }}
                          className={`lux-chip ${active ? 'lux-chip-active' : ''}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 04 · details */}
                <div className="mt-9 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="kd-name"
                      className="text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]"
                    >
                      Your name
                    </label>
                    <input
                      id="kd-name"
                      className="lux-input mt-3"
                      aria-label="Your name"
                      placeholder="e.g. Ahmed Raza"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="kd-phone"
                      className="text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]"
                    >
                      Phone · WhatsApp
                    </label>
                    <input
                      id="kd-phone"
                      className="lux-input mt-3"
                      aria-label="Phone or WhatsApp number"
                      placeholder="03XX XXXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="kd-notes"
                    className="text-[10px] uppercase tracking-[0.35em] text-[var(--gold)]"
                  >
                    Notes for the clinic
                  </label>
                  <textarea
                    id="kd-notes"
                    rows={3}
                    className="lux-input mt-3 resize-none"
                    aria-label="Notes for the clinic"
                    placeholder="Pain, sensitivity, previous treatment…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* error */}
                {error && (
                  <p
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300/90"
                  >
                    {error}
                  </p>
                )}

                {/* CTA row */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
                  <p className="text-xs text-[var(--ivory-muted)]">
                    Prefer talking?{' '}
                    <a
                      href={CLINIC.telUrl}
                      className="underline decoration-[rgba(198,161,91,0.5)] underline-offset-4 transition-colors duration-500 hover:text-[var(--gold-2)]"
                    >
                      Call {CLINIC.phoneDisplay}
                    </a>
                  </p>
                  <Magnetic>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className={
                        canSubmit
                          ? 'btn-gold'
                          : 'btn-gold cursor-not-allowed bg-white/5! text-white/30! shadow-none!'
                      }
                      style={
                        canSubmit
                          ? undefined
                          : {
                              background: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.3)',
                              boxShadow: 'none',
                              cursor: 'not-allowed',
                            }
                      }
                    >
                      {status === 'saving' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Reserving…
                        </>
                      ) : (
                        <>
                          Reserve my slot
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </Magnetic>
                </div>
              </form>
            )}
          </div>
        </FadeIn>

        {/* ---- info rail ---- */}
        <FadeIn delay={0.2} className="mt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* visit */}
            <div className="lux-card p-6">
              <MapPin size={18} className="text-[var(--gold)]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg text-[var(--ivory)]">Visit the atelier</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ivory-muted)]">
                {CLINIC.address}
              </p>
              <a
                href={CLINIC.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-[24px] items-center text-xs text-[var(--gold-2)] underline decoration-[rgba(198,161,91,0.4)] underline-offset-4 transition-colors duration-500 hover:text-[var(--gold)]"
              >
                Get directions →
              </a>
            </div>

            {/* talk */}
            <div className="lux-card p-6">
              <Phone size={18} className="text-[var(--gold)]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg text-[var(--ivory)]">Talk to us</h3>
              <p className="mt-2 text-xs text-[var(--ivory-muted)]">Call or WhatsApp</p>
              <p className="mt-1 font-display text-base text-[var(--ivory)]">
                {CLINIC.phoneIntl}
              </p>
              <a
                href={CLINIC.telUrl}
                className="mt-3 inline-flex min-h-[24px] items-center text-xs text-[var(--gold-2)] underline decoration-[rgba(198,161,91,0.4)] underline-offset-4 transition-colors duration-500 hover:text-[var(--gold)]"
              >
                Tap to call →
              </a>
            </div>

            {/* follow */}
            <div className="lux-card p-6">
              <Instagram size={18} className="text-[var(--gold)]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg text-[var(--ivory)]">Follow the smiles</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ivory-muted)]">
                Daily cases, offers &amp; smile tips
              </p>
              <a
                href={CLINIC.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-[24px] items-center text-xs text-[var(--gold-2)] underline decoration-[rgba(198,161,91,0.4)] underline-offset-4 transition-colors duration-500 hover:text-[var(--gold)]"
              >
                {CLINIC.instagram} →
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
