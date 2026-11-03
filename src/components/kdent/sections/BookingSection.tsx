'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import { SERVICES } from '../lib/store';
import SplitText from '../ui/SplitText';

const TIME_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
];

interface DayChip {
  iso: string;
  weekday: string;
  day: string;
  month: string;
  isSunday: boolean;
}

function buildDays(): DayChip[] {
  const out: DayChip[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isSunday: d.getDay() === 0,
    });
  }
  return out;
}

export default function BookingSection() {
  // dates are built client-side only (avoids SSR/client timezone hydration mismatch)
  const [days, setDays] = useState<DayChip[]>([]);
  useEffect(() => setDays(buildDays()), []);
  const [day, setDay] = useState<DayChip | null>(null);
  const [slot, setSlot] = useState<string>('');
  const [service, setService] = useState<string>(SERVICES[0].title);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const [waUrl, setWaUrl] = useState('');

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    !!day &&
    !!slot &&
    status !== 'saving' &&
    status !== 'done';

  const submit = async () => {
    if (!canSubmit || !day) return;
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          service,
          date: `${day.weekday}, ${day.day} ${day.month} ${new Date(day.iso).getFullYear()}`,
          timeSlot: day.isSunday ? `${slot} (Sunday — by appointment)` : slot,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Booking failed');
      }
      setStatus('done');
      setRef(String(data.bookingId).slice(-6).toUpperCase());
      setWaUrl(data.whatsappUrl);
      // zero friction: open WhatsApp confirmation immediately
      if (data.whatsappUrl) window.open(data.whatsappUrl, '_blank', 'noopener');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <section
      id="book"
      data-kd-phase="booking"
      className="relative flex min-h-[150vh] flex-col items-center justify-center px-5 py-28 text-white"
    >
      {/* curved theater depth */}
      <div className="kd-theater" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="text-center">
          <span className="kd-fade inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#F0FFD4] ring-1 ring-white/15">
            <CalendarDays className="h-3.5 w-3.5" /> The Closing Chamber
          </span>
          <SplitText
            text="Your chair is waiting."
            className="vel-type mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.02em] sm:text-6xl"
          />
          <p className="kd-fade mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
            Pick a day, a slot and the service — we confirm on WhatsApp within minutes.
            Mon–Sat 10:00 AM – 7:00 PM · Sunday by appointment.
          </p>
        </div>

        {/* booking console */}
        <div className="kd-fade kd-booking-console mt-12 rounded-[32px] p-6 sm:p-9">
          {status === 'done' ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FFD4] text-[#0F172A]">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h3 className="vel-type mt-6 text-3xl font-bold">Booked. Breathe easy.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
                Request <span className="font-mono font-bold text-[#F0FFD4]">#{ref}</span> for{' '}
                <b className="text-white">{service}</b> on{' '}
                <b className="text-white">{day ? `${day.weekday}, ${day.day} ${day.month}` : ''}</b> at{' '}
                <b className="text-white">{slot}</b> is with the clinic. A WhatsApp window has
                opened to confirm instantly — or tap below.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full bg-[#F0FFD4] px-7 py-3.5 text-sm font-bold text-[#0F172A] transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    <Send className="h-4 w-4" /> Confirm on WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    setStatus('idle');
                    setSlot('');
                    setDay(null);
                    setNotes('');
                  }}
                  className="rounded-full bg-white/10 px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
                >
                  Book another visit
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-8">
              {/* step 1 — day */}
              <div>
                <p className="kd-step-label">01 · Choose your day</p>
                <div className="kd-chip-scroll mt-4 flex gap-2 overflow-x-auto pb-2">
                  {days.length === 0
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[64px] min-w-16 animate-pulse rounded-2xl bg-white/[0.06]"
                          aria-hidden="true"
                        />
                      ))
                    : days.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => setDay(d)}
                      className={`kd-day-chip ${day?.iso === d.iso ? 'kd-day-active' : ''} ${
                        d.isSunday ? 'kd-day-sunday' : ''
                      }`}
                      aria-pressed={day?.iso === d.iso}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {d.isSunday ? 'Sun*' : d.weekday}
                      </span>
                      <span className="text-lg font-bold leading-none">{d.day}</span>
                      <span className="text-[10px] uppercase opacity-70">{d.month}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* step 2 — time */}
              <div>
                <p className="kd-step-label">
                  02 · Pick a slot{' '}
                  {day?.isSunday && (
                    <span className="ml-2 rounded-full bg-[#F0FFD4]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F0FFD4]">
                      Sunday — priority appointments only
                    </span>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`kd-slot-chip ${slot === s ? 'kd-slot-active' : ''}`}
                      aria-pressed={slot === s}
                    >
                      <Clock className="h-3 w-3 opacity-70" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* step 3 — service + details */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="kd-step-label">03 · What do you need?</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...SERVICES.map((s) => s.title), 'Not sure — advise me'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setService(s)}
                        className={`kd-slot-chip ${service === s ? 'kd-slot-active' : ''}`}
                        aria-pressed={service === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="kd-step-label">Your name</p>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ahmed Raza"
                      className="kd-input mt-3"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <p className="kd-step-label">Phone / WhatsApp</p>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03XX XXXXXXX"
                      inputMode="tel"
                      className="kd-input mt-3"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="kd-step-label">Anything we should know? (optional)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pain, sensitivity, previous treatment…"
                  rows={3}
                  className="kd-input mt-3 resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 ring-1 ring-red-400/20">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs leading-relaxed text-white/40">
                  Zero-friction booking — your request lands with the clinic instantly.
                  Prefer talking? <a className="underline decoration-white/30 hover:text-white/70" href="tel:+923325855589">Call 0332 5855589</a>
                </p>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className={`kd-cta-primary vel-type group relative overflow-hidden rounded-full px-9 py-4 text-base font-semibold transition-all ${
                    canSubmit
                      ? 'bg-[#F0FFD4] text-[#0F172A] shadow-[0_18px_60px_-12px_rgba(216,245,163,0.4)] hover:scale-[1.03] active:scale-95'
                      : 'cursor-not-allowed bg-white/10 text-white/40'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {status === 'saving' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Reserving…
                      </>
                    ) : (
                      <>
                        Reserve my slot <Send className="h-4 w-4" />
                      </>
                    )}
                  </span>
                  {canSubmit && <span className="kd-cta-sheen" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* contact strip */}
        <div className="kd-fade mt-10 grid gap-4 sm:grid-cols-3">
          <div className="kd-glass-dark rounded-3xl p-5">
            <MapPin className="h-5 w-5 text-[#F0FFD4]" />
            <p className="mt-3 text-sm font-semibold">Visit the studio</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Shop G-7, Farhan Heights, Jinnah Road, Bani Gala, Islamabad
            </p>
            <a
              className="mt-3 inline-block text-xs font-semibold text-[#F0FFD4] underline decoration-[#F0FFD4]/40 hover:decoration-[#F0FFD4]"
              href="https://www.google.com/maps/search/?api=1&query=K+Dent+Dental+%26+Aesthetic+Care+Farhan+Heights+Bani+Gala+Islamabad"
              target="_blank"
              rel="noreferrer"
            >
              Get directions →
            </a>
          </div>
          <div className="kd-glass-dark rounded-3xl p-5">
            <Phone className="h-5 w-5 text-[#F0FFD4]" />
            <p className="mt-3 text-sm font-semibold">Talk to us</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Call or WhatsApp <br />+92 332 5855589
            </p>
            <a
              className="mt-3 inline-block text-xs font-semibold text-[#F0FFD4] underline decoration-[#F0FFD4]/40 hover:decoration-[#F0FFD4]"
              href="tel:+923325855589"
            >
              Tap to call →
            </a>
          </div>
          <div className="kd-glass-dark rounded-3xl p-5">
            <Instagram className="h-5 w-5 text-[#F0FFD4]" />
            <p className="mt-3 text-sm font-semibold">Follow the smiles</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Daily cases, offers & smile tips
            </p>
            <a
              className="mt-3 inline-block text-xs font-semibold text-[#F0FFD4] underline decoration-[#F0FFD4]/40 hover:decoration-[#F0FFD4]"
              href="https://www.instagram.com/kdent_care"
              target="_blank"
              rel="noreferrer"
            >
              @kdent_care →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
