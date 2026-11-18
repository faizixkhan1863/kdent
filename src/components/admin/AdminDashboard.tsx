"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AudioLines, Calendar, CalendarDays, CalendarRange, CalendarX, Check, CheckCheck, Clock, Globe,
  Hourglass, Lock, LogOut, Phone, RefreshCw, Search, ShieldCheck, Sparkles, Stethoscope, TriangleAlert, Users, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  API contract types (GET/PATCH /api/admin/appointments,             */
/*  GET /api/voice-agent/availability)                                 */
/* ------------------------------------------------------------------ */

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
type AppointmentType = "new" | "followup";
type AppointmentSource = "voice-agent" | "web" | "admin";

interface Appointment {
  id: string;
  name: string;
  phone: string;
  service: string;
  type: AppointmentType;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM (24h)
  notes: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  createdAt: string;
}

interface DashboardStats {
  today: number;
  week: number;
  pending: number;
  newPatients: number;
  followups: number;
}

interface AppointmentsResponse {
  ok: boolean;
  pinDefault?: boolean;
  appointments?: Appointment[];
  stats?: DashboardStats;
}

interface AvailabilitySlot {
  time: string;
  booked: boolean;
  appointment?: { name: string; service: string; type: AppointmentType };
}

interface AvailabilityResponse {
  ok: boolean;
  date?: string;
  closed?: boolean;
  slots?: AvailabilitySlot[];
}

type AuthPhase = "checking" | "gate" | "ready";
type StatusFilter = "sab" | AppointmentStatus;
type TypeFilter = "sab" | AppointmentType;

/* ------------------------------------------------------------------ */
/*  Constants + helpers                                                */
/* ------------------------------------------------------------------ */

const PIN_STORAGE_KEY = "tkdent-admin-pin";
const AUTO_REFRESH_MS = 15_000;

const FULL_DAYS: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_DAYS_SHORT: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function karachiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatKarachiDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi", weekday: "short", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(now);
  const lookup = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayIndex = EN_DAYS_SHORT.indexOf(lookup("weekday"));
  return `${FULL_DAYS[weekdayIndex >= 0 ? weekdayIndex : 0]}, ${lookup("day")} ${lookup("month")} ${lookup("year")}`;
}

function formatSlotTime12h(hhmm: string): string {
  const segments = hhmm.split(":");
  const hours = Number.parseInt(segments[0] ?? "", 10);
  if (Number.isNaN(hours)) return hhmm;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${segments[1] ?? "00"} ${suffix}`;
}

function formatApptDate(isoDate: string): string {
  const segments = isoDate.split("-");
  const year = Number.parseInt(segments[0] ?? "", 10);
  const month = Number.parseInt(segments[1] ?? "", 10);
  const day = Number.parseInt(segments[2] ?? "", 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || month < 1 || month > 12) return isoDate;
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function waHrefFor(appt: Appointment): string | null {
  const digits = appt.phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  const normalized = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const message = `Hello ${appt.name}, this is TK Dent Dental & Aesthetic Care regarding your ${appt.service} appointment on ${formatApptDate(appt.date)} at ${formatSlotTime12h(appt.timeSlot)}.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<AppointmentStatus, { label: string; dot: string; pill: string }> = {
  pending: { label: "Pending", dot: "bg-amber-500", pill: "border-amber-200 bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmed", dot: "bg-teal", pill: "border-teal/25 bg-mint text-teal-2" },
  completed: { label: "Completed", dot: "bg-emerald-500", pill: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", dot: "bg-rose-500", pill: "border-rose-200 bg-rose-50 text-rose-600" },
};

const ICON_TONES = {
  confirm: "border-teal/30 bg-mint/70 text-teal-2 hover:bg-teal hover:text-white",
  complete: "border-teal/25 bg-white/80 text-ink-3 hover:bg-teal-2 hover:text-white",
  cancel: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white",
} as const;
type IconTone = keyof typeof ICON_TONES;

const badgeBase = "inline-flex items-center gap-1.5 rounded-full border border-teal/15 bg-porcelain-2 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-ink-3";
const controlCls = "h-10 rounded-xl border border-teal/20 bg-white/90 px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-teal";

function StatusPill({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

function TypeBadge({ type }: { type: AppointmentType }) {
  return type === "new" ? (
    <span className="rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">New</span>
  ) : (
    <span className="rounded-full border border-teal/40 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-2">Follow-up</span>
  );
}

function SourceBadge({ source }: { source: AppointmentSource }) {
  if (source === "voice-agent") {
    return <span className={badgeBase}><AudioLines className="h-3 w-3 text-teal" aria-hidden />Voice AI</span>;
  }
  if (source === "web") {
    return <span className={badgeBase}><Globe className="h-3 w-3 text-teal-2" aria-hidden />Web</span>;
  }
  return <span className={badgeBase}><ShieldCheck className="h-3 w-3 text-teal-2" aria-hidden />Admin</span>;
}

function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-teal/15 bg-white/85 p-5 shadow-sm backdrop-blur transition duration-500 hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md md:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-ink md:text-[11px]">{label}</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-teal-2">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div className="mt-4 font-display text-3xl leading-none text-ink md:text-4xl">{value}</div>
      <div className="mt-2 text-xs text-muted-ink">{hint}</div>
    </div>
  );
}

function IconButton({ label, icon: Icon, tone, disabled, onClick }: {
  label: string; icon: LucideIcon; tone: IconTone; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition duration-300 focus-visible:outline-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-40 ${ICON_TONES[tone]}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function SlotChip({ slot }: { slot: AvailabilitySlot }) {
  const time12 = formatSlotTime12h(slot.time);
  if (!slot.booked) {
    return (
      <div className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-teal/20 bg-mint/50 px-2 py-2 text-center">
        <span className="text-xs font-bold text-teal-2">{time12}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal/70">Free</span>
      </div>
    );
  }
  const booked = slot.appointment;
  return (
    <div
      className="flex min-h-[56px] flex-col justify-center rounded-xl border border-ink-2 bg-ink-2 px-3 py-2 text-white"
      title={booked ? `${booked.name} — ${booked.service}` : "Booked"}
    >
      <span className="text-xs font-bold text-mint-glow">{time12}</span>
      <span className="truncate text-[11px] font-semibold">{booked?.name ?? "Booked"}</span>
      {booked?.service ? <span className="truncate text-[10px] text-white/55">{booked.service}</span> : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Appointments load ho rahi hain">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-teal/10 bg-white/60 p-4 md:p-5" aria-hidden>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded-full bg-porcelain-2" />
            <div className="h-3 w-1/4 rounded-full bg-porcelain-2" />
            <div className="h-3 w-2/3 rounded-full bg-porcelain-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[132px] animate-pulse rounded-3xl border border-teal/10 bg-white/60" />
      ))}
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-teal/10 bg-white/60" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appointment row                                                    */
/* ------------------------------------------------------------------ */

function AppointmentRow({ appt, isToday, busy, onStatus }: {
  appt: Appointment; isToday: boolean; busy: boolean; onStatus: (appt: Appointment, next: AppointmentStatus) => void;
}) {
  const time12 = formatSlotTime12h(appt.timeSlot);
  const waLink = waHrefFor(appt);
  const canConfirm = appt.status === "pending";
  const canComplete = appt.status === "pending" || appt.status === "confirmed";
  const canCancel = appt.status === "pending" || appt.status === "confirmed";

  return (
    <li className="rounded-2xl border border-teal/15 bg-white/85 p-4 shadow-sm backdrop-blur transition duration-500 hover:-translate-y-0.5 hover:border-teal/35 hover:shadow-md md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{appt.name}</span>
            <TypeBadge type={appt.type} />
            {isToday ? (
              <span className="rounded-full bg-ink-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mint-glow">Today</span>
            ) : null}
          </div>
          {waLink ? (
            <a
              href={waLink} target="_blank" rel="noreferrer"
              aria-label={`WhatsApp ${appt.name} — ${appt.phone}`}
              className="mt-1.5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-teal-2 underline-offset-4 transition hover:text-teal hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {appt.phone}
            </a>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-ink-3">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {appt.phone}
            </span>
          )}
          {appt.notes ? <p className="mt-1.5 text-xs leading-relaxed text-muted-ink">Note: {appt.notes}</p> : null}
        </div>
        <StatusPill status={appt.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-teal-2">
          <Stethoscope className="h-3.5 w-3.5" aria-hidden />
          {appt.service}
        </span>
        <SourceBadge source={appt.source} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-teal/10 pt-3 text-sm text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-teal" aria-hidden />
          {formatApptDate(appt.date)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-teal" aria-hidden />
          {time12}
        </span>
        <span className="text-xs text-muted-ink">{relativeTime(appt.createdAt)}</span>
        {canConfirm || canComplete || canCancel ? (
          <div className="ml-auto flex items-center gap-2" aria-label={`${appt.name} — status actions`}>
            {canConfirm ? (
              <IconButton label="Confirm appointment" icon={Check} tone="confirm" disabled={busy} onClick={() => onStatus(appt, "confirmed")} />
            ) : null}
            {canComplete ? (
              <IconButton label="Mark as completed" icon={CheckCheck} tone="complete" disabled={busy} onClick={() => onStatus(appt, "completed")} />
            ) : null}
            {canCancel ? (
              <IconButton label="Cancel appointment" icon={X} tone="cancel" disabled={busy} onClick={() => onStatus(appt, "cancelled")} />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pinDefault, setPinDefault] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("sab");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("sab");
  const [serviceFilter, setServiceFilter] = useState("sab");
  const [query, setQuery] = useState("");

  const [slotDate, setSlotDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [slotClosed, setSlotClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const pinRef = useRef<string | null>(null);
  const slotDateRef = useRef("");
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  pinRef.current = pin;
  slotDateRef.current = slotDate;

  /* ---- data loaders ---- */

  const loadAppointments = useCallback(async (candidatePin: string, silent = false) => {
    if (!candidatePin) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/appointments", { headers: { "x-admin-pin": candidatePin }, cache: "no-store" });
      if (res.status === 401) {
        window.localStorage.removeItem(PIN_STORAGE_KEY);
        setPin(null);
        setAppointments([]);
        setStats(null);
        setPinDefault(false);
        setGateError("Session expired — please enter the PIN again.");
        setPhase("gate");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AppointmentsResponse;
      if (!data.ok || !Array.isArray(data.appointments)) throw new Error("Invalid payload");
      setAppointments(data.appointments);
      setStats(data.stats ?? null);
      setPinDefault(Boolean(data.pinDefault));
    } catch {
      if (!silent) setError("Could not load data — please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadAvailability = useCallback(async (date: string, silent = false) => {
    if (!date) return;
    if (!silent) setSlotsLoading(true);
    try {
      const res = await fetch(`/api/voice-agent/availability?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AvailabilityResponse;
      if (!data.ok) throw new Error("Invalid payload");
      setSlotClosed(Boolean(data.closed));
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      setSlotsError(null);
    } catch {
      setSlotsError("Slot board could not load.");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const verifyPin = useCallback(async (candidate: string, fromStorage: boolean): Promise<boolean> => {
    setVerifying(true);
    setGateError(null);
    try {
      const res = await fetch("/api/admin/appointments", { headers: { "x-admin-pin": candidate }, cache: "no-store" });
      if (res.status === 401) {
        window.localStorage.removeItem(PIN_STORAGE_KEY);
        setPin(null);
        setGateError(fromStorage ? "Saved PIN is no longer valid — please enter it again." : "Incorrect PIN");
        setShake(true);
        setPhase("gate");
        return false;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AppointmentsResponse;
      if (!data.ok || !Array.isArray(data.appointments)) throw new Error("Invalid payload");
      window.localStorage.setItem(PIN_STORAGE_KEY, candidate);
      setPin(candidate);
      setAppointments(data.appointments);
      setStats(data.stats ?? null);
      setPinDefault(Boolean(data.pinDefault));
      setError(null);
      setLoading(false);
      setRefreshing(false);
      setPhase("ready");
      return true;
    } catch {
      setGateError("Cannot reach the server — please try again in a moment.");
      setPhase("gate");
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const currentPin = pinRef.current;
    if (!currentPin) return;
    setRefreshing(true);
    await Promise.all([loadAppointments(currentPin, true), loadAvailability(slotDateRef.current, true)]);
    setRefreshing(false);
  }, [loadAppointments, loadAvailability]);

  const retryLoad = useCallback(() => {
    const currentPin = pinRef.current;
    if (currentPin) void loadAppointments(currentPin, false);
  }, [loadAppointments]);

  /* ---- lifecycle ---- */

  useEffect(() => {
    setSlotDate(karachiToday());
    const saved = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (!saved) {
      setPhase("gate");
      return;
    }
    setPin(saved);
    void verifyPin(saved, true);
  }, [verifyPin]);

  useEffect(() => {
    if (phase === "gate") pinInputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready" || !auto) return;
    const id = window.setInterval(() => {
      void refreshAll();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [phase, auto, refreshAll]);

  useEffect(() => {
    if (phase !== "ready" || !slotDate) return;
    void loadAvailability(slotDate);
  }, [phase, slotDate, loadAvailability]);

  /* ---- actions ---- */

  const submitGate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = pinInput.trim();
    if (!candidate) {
      setGateError("Please enter the PIN first.");
      setShake(true);
      return;
    }
    void verifyPin(candidate, false).then((ok) => {
      if (ok) setPinInput("");
    });
  };

  const logout = useCallback(() => {
    window.localStorage.removeItem(PIN_STORAGE_KEY);
    setPin(null);
    setPhase("gate");
    setPinDefault(false);
    setAppointments([]);
    setStats(null);
    setSlots(null);
    setSlotClosed(false);
    setSlotsError(null);
    setError(null);
    setGateError(null);
    setPinInput("");
  }, []);

  const updateStatus = async (appt: Appointment, next: AppointmentStatus) => {
    if (next === "cancelled" && !window.confirm(`Cancel ${appt.name}'s appointment?`)) return;
    const currentPin = pinRef.current;
    if (!currentPin || updatingId) return;
    const previous = appointments;
    setAppointments((current) => current.map((item) => (item.id === appt.id ? { ...item, status: next } : item)));
    setUpdatingId(appt.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-pin": currentPin },
        body: JSON.stringify({ id: appt.id, status: next }),
      });
      if (res.status === 401) {
        window.localStorage.removeItem(PIN_STORAGE_KEY);
        setPin(null);
        setGateError("Session expired — please enter the PIN again.");
        setPhase("gate");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      void loadAppointments(currentPin, true); // refresh stats quietly
      void loadAvailability(slotDateRef.current, true); // slot board follows PATCH actions
    } catch {
      setAppointments(previous);
      setError("Status update failed — please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---- derived ---- */

  const services = useMemo(() => {
    const unique = new Set<string>();
    for (const item of appointments) {
      if (item.service) unique.add(item.service);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const activeServiceFilter = services.includes(serviceFilter) ? serviceFilter : "sab";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const list = appointments.filter((item) => {
      if (statusFilter !== "sab" && item.status !== statusFilter) return false;
      if (typeFilter !== "sab" && item.type !== typeFilter) return false;
      if (activeServiceFilter !== "sab" && item.service !== activeServiceFilter) return false;
      if (q) {
        const nameHit = item.name.toLowerCase().includes(q);
        const phoneHit = qDigits.length > 0 && item.phone.replace(/\D/g, "").includes(qDigits);
        if (!nameHit && !phoneHit) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.timeSlot !== b.timeSlot) return a.timeSlot < b.timeSlot ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    });
  }, [appointments, statusFilter, typeFilter, activeServiceFilter, query]);

  const todayKey = karachiToday();
  const headerDate = formatKarachiDate(new Date());
  const freeCount = slots ? slots.filter((slot) => !slot.booked).length : 0;
  const bookedCount = slots ? slots.length - freeCount : 0;

  const statCards: { icon: LucideIcon; label: string; value: string; hint: string }[] = [
    { icon: CalendarDays, label: "Today", value: String(stats?.today ?? 0), hint: "Today's appointments" },
    { icon: CalendarRange, label: "This week", value: String(stats?.week ?? 0), hint: "This week's appointments" },
    { icon: Hourglass, label: "Pending", value: String(stats?.pending ?? 0), hint: "Awaiting confirmation" },
    { icon: Users, label: "New / Follow-up", value: `${stats?.newPatients ?? 0} / ${stats?.followups ?? 0}`, hint: "New patients vs follow-ups" },
  ];

  /* ---- render: checking ---- */

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-5" role="status" aria-live="polite">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-teal/20 border-t-teal" aria-hidden />
          <p className="text-sm text-muted-ink">Checking dashboard...</p>
        </div>
      </div>
    );
  }

  /* ---- render: PIN gate ---- */

  if (phase === "gate") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <style>{`
          @keyframes admin-shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
          }
          .admin-shake { animation: admin-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        `}</style>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[-8%] h-[420px] w-[420px] rounded-full bg-mint-glow/30 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-8%] h-[400px] w-[400px] rounded-full bg-teal/10 blur-3xl" />
        </div>
        <div
          className={`w-full max-w-md rounded-3xl border border-teal/15 bg-white/90 p-8 shadow-xl shadow-teal/10 backdrop-blur md:p-10 ${shake ? "admin-shake" : ""}`}
          onAnimationEnd={() => setShake(false)}
        >
          <div className="text-center font-display text-2xl leading-none text-ink">TK<span className="text-teal-3">·</span>Dent</div>
          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-2 to-teal-3 text-white shadow-lg shadow-teal/30">
            <Lock className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-5 text-center font-display text-3xl text-ink">Doctors Dashboard</h1>
          <p className="mt-2 text-center text-sm text-muted-ink">For clinic staff only — enter your PIN</p>
          <form className="mt-8 space-y-4" onSubmit={submitGate}>
            <div>
              <label htmlFor="admin-pin" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-ink-3">Admin PIN</label>
              <input
                ref={pinInputRef}
                id="admin-pin" type="password" inputMode="numeric" autoComplete="current-password"
                value={pinInput}
                onChange={(event) => {
                  setPinInput(event.target.value);
                  if (gateError) setGateError(null);
                }}
                placeholder="••••" aria-invalid={Boolean(gateError)}
                aria-describedby={gateError ? "admin-pin-error" : undefined}
                className="h-12 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 text-center text-lg font-semibold tracking-[0.5em] text-ink placeholder:tracking-[0.3em] placeholder:text-muted-ink/50 focus-visible:outline-2 focus-visible:outline-teal"
              />
            </div>
            {gateError ? (
              <p id="admin-pin-error" role="alert" className="text-center text-sm font-medium text-rose-600">{gateError}</p>
            ) : null}
            <button type="submit" disabled={verifying || pinInput.trim().length === 0} className="btn-teal w-full disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} aria-hidden />
              {verifying ? "Verifying…" : "Enter"}
            </button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-ink">
            Appointments booked by the AI voice agent and the website appear here instantly.
          </p>
        </div>
      </div>
    );
  }

  /* ---- render: dashboard ---- */

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {/* top bar */}
      <header className="rounded-3xl border border-teal/15 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="font-display text-3xl leading-none text-ink md:text-4xl">TK<span className="text-teal-3">·</span>Dent</div>
            <span className="hidden h-10 w-px bg-teal/20 sm:block" aria-hidden />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal">Doctors Dashboard</div>
              <div className="mt-1 text-sm text-muted-ink">{headerDate} · Asia/Karachi</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pinDefault ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                Default PIN active — change it via the ADMIN_PIN environment variable
              </span>
            ) : null}
            <button
              type="button" onClick={() => setAuto((value) => !value)} aria-pressed={auto} aria-label="Auto refresh on/off"
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-[0.14em] transition duration-300 focus-visible:outline-2 focus-visible:outline-teal ${
                auto ? "border-teal/30 bg-mint text-teal-2" : "border-ink/10 bg-white/70 text-muted-ink hover:border-teal/30"
              }`}
            >
              {auto ? (
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-3 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                </span>
              ) : null}
              Auto
            </button>
            <button type="button" onClick={retryLoad} disabled={refreshing} className="btn-teal disabled:opacity-70">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
            <button
              type="button" onClick={logout} aria-label="Logout" title="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink-3 transition duration-300 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-teal"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* stats */}
      <section aria-label="Dashboard stats" className="mt-6">
        {loading && !stats ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {statCards.map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} hint={card.hint} />
            ))}
          </div>
        )}
      </section>

      {/* global error strip */}
      {error ? (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button
            type="button" onClick={retryLoad}
            className="h-10 rounded-full border border-rose-300 bg-white px-5 text-xs font-bold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-teal"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* list + slot board */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main>
          <section className="rounded-3xl border border-teal/15 bg-white/85 shadow-sm backdrop-blur">
            <div className="space-y-4 p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-ink">Appointments</h2>
                <span className="inline-flex items-center gap-2 rounded-full border border-teal/15 bg-porcelain-2 px-3 py-1.5 text-[11px] font-semibold text-ink-3">
                  {filtered.length} / {appointments.length} shown
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-ink" aria-hidden />
                  <input
                    id="admin-search" type="search" value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or phone" aria-label="Search by name or phone"
                    className="h-10 w-full rounded-xl border border-teal/20 bg-white/90 pl-9 pr-3 text-sm text-ink placeholder:text-muted-ink/70 focus-visible:outline-2 focus-visible:outline-teal"
                  />
                </div>
                <select
                  aria-label="Status filter" value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className={controlCls}
                >
                  <option value="sab">Status: All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  aria-label="Type filter" value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                  className={controlCls}
                >
                  <option value="sab">Type: All</option>
                  <option value="new">New</option>
                  <option value="followup">Follow-up</option>
                </select>
                <select
                  aria-label="Service filter" value={activeServiceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                  className={controlCls}
                >
                  <option value="sab">Service: All</option>
                  {services.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="va-scroll max-h-[62vh] overflow-y-auto px-5 pb-5 md:px-6 md:pb-6" aria-busy={refreshing} aria-live="polite">
              {loading ? (
                <ListSkeleton />
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-teal/25 bg-white/70 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-teal-2">
                    <Sparkles className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="mt-4 font-display text-2xl text-ink">No appointments found</p>
                  <p className="mt-1 text-sm text-muted-ink">Reset the filters, or wait for new bookings to arrive.</p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="Appointments list">
                  {filtered.map((appt) => (
                    <AppointmentRow
                      key={appt.id} appt={appt} isToday={appt.date === todayKey} busy={updatingId === appt.id} onStatus={updateStatus}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        <aside className="rounded-3xl border border-teal/15 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6" aria-label="Slot board">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">Slot Board</h2>
            <input
              type="date" value={slotDate} onChange={(event) => setSlotDate(event.target.value)}
              aria-label="Slot board date" className={controlCls}
            />
          </div>
          <p className="mt-1 text-xs text-muted-ink">
            {slotDate ? formatApptDate(slotDate) : "—"} · voice agent & website bookings
          </p>

          <div className="mt-4">
            {slotsLoading ? (
              <SlotsSkeleton />
            ) : slotsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{slotsError}</span>
                </div>
                <button
                  type="button" onClick={() => void loadAvailability(slotDateRef.current || slotDate)}
                  className="mt-3 h-10 w-full rounded-full border border-rose-300 bg-white text-xs font-bold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-teal"
                >
                  Retry
                </button>
              </div>
            ) : slotClosed ? (
              <div className="rounded-2xl border border-teal/15 bg-porcelain-2 px-4 py-10 text-center">
                <CalendarX className="mx-auto h-8 w-8 text-teal-2" aria-hidden />
                <p className="mt-3 font-semibold text-ink">Clinic closed (Sunday)</p>
                <p className="mt-1 text-xs text-muted-ink">Open for appointment-based visits only.</p>
              </div>
            ) : slots && slots.length > 0 ? (
              <>
                <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-ink">
                  <span>{freeCount} free</span>
                  <span>{bookedCount} booked</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <SlotChip key={slot.time} slot={slot} />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-teal/25 bg-porcelain-2 px-4 py-8 text-center text-sm text-muted-ink">
                No slots available for this date.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
