/**
 * TK Dent — clinic scheduling helpers.
 * Slots are 30 minutes, Mon–Sat 10:00–19:00 (last slot starts 18:30).
 * All "today" logic uses Asia/Karachi so the clinic never sees a
 * foreign-timezone day boundary.
 */

export const CLINIC_TZ = "Asia/Karachi";

export const SERVICES = [
  "Smile Design / Cosmetic",
  "Clear Aligners / Braces",
  "Dental Implants",
  "Painless Root Canal",
  "Whitening & Polishing",
  "Crowns & Veneers",
  "General / Family Dentistry",
  "Kids Dentistry",
] as const;

export const APPT_TYPES = ["new", "followup"] as const;
export const APPT_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

export type ApptType = (typeof APPT_TYPES)[number];
export type ApptStatus = (typeof APPT_STATUSES)[number];

/** "YYYY-MM-DD" for a Date shifted into the clinic timezone. */
export function clinicDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Current clinic clock "HH:mm". */
export function clinicTimeKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** 0 = Sunday … 6 = Saturday for a date key (clinic timezone). */
export function weekdayIndex(dateKey: string): number {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TZ, weekday: "short" })
    .format(new Date(`${dateKey}T12:00:00Z`));
  return names.indexOf(wd);
}

export function isClosedDay(dateKey: string): boolean {
  return weekdayIndex(dateKey) === 0; // Sunday
}

/** Shift a YYYY-MM-DD key by n days. */
export function shiftDateKey(dateKey: string, n: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** All bookable start times ("HH:mm") for a clinic day. */
export function allSlots(): string[] {
  const out: string[] = [];
  for (let mins = 10 * 60; mins <= 18 * 60 + 30; mins += 30) {
    out.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
  }
  return out;
}

export interface ApptRecord {
  id: string;
  name: string;
  phone: string;
  service: string;
  type: string;
  date: string;
  timeSlot: string;
  notes: string | null;
  status: string;
  source: string;
  createdAt: string;
}

/** A slot is occupied when an active (non-cancelled) appointment holds it. */
export function bookedSlotsFor(appts: ApptRecord[], dateKey: string, ignoreId?: string): Set<string> {
  const set = new Set<string>();
  for (const a of appts) {
    if (a.date !== dateKey) continue;
    if (a.status === "cancelled") continue;
    if (ignoreId && a.id === ignoreId) continue;
    set.add(a.timeSlot);
  }
  return set;
}

/** Free slots for a date key; empty array when Sunday. */
export function freeSlotsFor(appts: ApptRecord[], dateKey: string): string[] {
  if (isClosedDay(dateKey)) return [];
  const taken = bookedSlotsFor(appts, dateKey);
  const todayKey = clinicDateKey();
  const nowTime = clinicTimeKey();
  return allSlots().filter((t) => {
    if (taken.has(t)) return false;
    // never offer slots already in the past for today
    if (dateKey === todayKey && t <= nowTime) return false;
    return true;
  });
}

export interface DayAvailability {
  date: string;
  closed: boolean;
  slots: Array<{ time: string; booked: boolean; appointment?: { name: string; service: string; type: string } }>;
}

/** Full slot board for the next n days (dashboard + voice agent). */
export function availabilityBoard(appts: ApptRecord[], days = 7, fromKey?: string): DayAvailability[] {
  const start = fromKey ?? clinicDateKey();
  const out: DayAvailability[] = [];
  for (let i = 0; i < days; i += 1) {
    const key = shiftDateKey(start, i);
    if (isClosedDay(key)) {
      out.push({ date: key, closed: true, slots: [] });
      continue;
    }
    const taken = bookedSlotsFor(appts, key);
    const todayKey = clinicDateKey();
    const nowTime = clinicTimeKey();
    const slots = allSlots().map((t) => {
      const holder = appts.find(
        (a) => a.date === key && a.timeSlot === t && a.status !== "cancelled",
      );
      const pastToday = key === todayKey && t <= nowTime;
      return {
        time: t,
        booked: taken.has(t) || pastToday,
        appointment: holder
          ? { name: holder.name, service: holder.service, type: holder.type }
          : undefined,
      };
    });
    out.push({ date: key, closed: false, slots });
  }
  return out;
}

/** Compact free-slot summary injected into the LLM prompt. */
export function availabilityPromptBlock(appts: ApptRecord[], days = 7): string {
  const board = availabilityBoard(appts, days);
  const lines: string[] = [];
  for (const day of board) {
    const free = day.slots.filter((s) => !s.booked).map((s) => s.time);
    const wd = weekdayIndex(day.date);
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (day.closed) {
      lines.push(`${day.date} (${names[wd]}): CLOSED`);
    } else if (free.length === 0) {
      lines.push(`${day.date} (${names[wd]}): fully booked`);
    } else {
      lines.push(`${day.date} (${names[wd]}): free = ${free.join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Normalise a phone string: keep digits/+; tolerate Urdu-Indic digits. */
export function normalizePhone(raw: string): string {
  const eastern = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const mapped = raw.replace(/[۰-۹٠-٩]/g, (ch) => {
    const e = eastern.indexOf(ch);
    return String(e >= 0 ? e : arabic.indexOf(ch));
  });
  const digits = mapped.replace(/[^\d+]/g, "");
  return digits.slice(0, 20);
}

export function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

/** Validate/normalise a booking date key (must be within ~60 days). */
export function normalizeDateKey(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const key = `${m[1]}-${m[2]}-${m[3]}`;
  if (Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 1 || Number(m[3]) > 31) return null;
  const today = clinicDateKey();
  if (key < today) return null;
  if (key > shiftDateKey(today, 60)) return null;
  return key;
}

export function normalizeSlot(raw: string): string | null {
  const t = raw.trim().replace(/\s/g, "");
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const mins = Number(m[2]);
  if (h < 0 || h > 23 || mins % 15 !== 0) return null;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
