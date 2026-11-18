"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  BadgeCheck,
  CalendarDays,
  Clock,
  Loader2,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* types + constants                                                   */
/* ------------------------------------------------------------------ */

type AgentState = "idle" | "listening" | "thinking" | "speaking";
type Lang = "ur" | "en";
type Emotion = "neutral" | "warm" | "reassuring" | "excited" | "sorry";
interface QueueItem {
  text: string;
  emotion: Emotion;
}
interface DraftFields {
  name?: string;
  phone?: string;
  service?: string;
  type?: string;
  date?: string;
  time?: string;
}
type BookingView =
  | { kind: "collecting"; fields: DraftFields }
  | { kind: "booked"; appt: { name: string; service: string; type: string; date: string; time: string } }
  | { kind: "failed"; reason?: string };

const DEFAULT_AGENTS = ["agent_7801m7qwj5qke8jr2vfnd8svng6x"]; // Sana — ElevenLabs ConvAI (public agent)

const GREETING =
  "[warm] السلام علیکم! میں ثنا ہوں، ٹی کے ڈینٹ کی وائس اسسٹنٹ۔ آپ آواز سے یا لکھ کر ٹریٹمنٹس، اوقات یا اپوائنٹمنٹ کے بارے میں پوچھ سکتے ہیں۔";
const WHATSAPP_URL =
  "https://wa.me/923123329479?text=" +
  encodeURIComponent("Assalam o Alaikum! Main appointment book karna chah raha/chah rahi hoon.");
const MIC_DENIED = "Mic ki permission nahi mili — aap text se bhi pooch saktay hain.";
const EL_FAILED_HINT = "Premium voice busy hai — offline mode chal raha hai.";

const EMOTION_RE = /^\s*\[(warm|reassuring|excited|neutral|sorry)\]/i;
const EMO_LIST: Emotion[] = ["warm", "reassuring", "excited", "neutral", "sorry"];

/* fast end-of-speech + instant barge-in tuning (legacy pipeline) */
const SILENCE_FRAMES = 42; // ~700ms of quiet -> submit immediately
const SPEAK_RMS = 0.085;
const BARGE_RMS = 0.21;
const BARGE_FRAMES = 16; // ~270ms sustained speech interrupts Sana
const BARGE_GRACE_MS = 900;

/* minimal SpeechRecognition typings (Safari-safe, no lookbehind regex) */
interface SRResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SRErrorEvent {
  error: string;
}
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SRResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SRInstance;

interface ElConversation {
  endSession(): Promise<void>;
  sendUserMessage(text: string): void;
  getInputVolume(): number;
  getOutputVolume(): number;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function splitSentences(text: string): string[] {
  const raw: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (".!?؟۔".includes(ch) || ch === "\n") {
      const t = cur.trim();
      if (t) raw.push(t);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) raw.push(cur.trim());

  const merged: string[] = [];
  for (const part of raw) {
    const last = merged[merged.length - 1];
    if (last && (last.length < 14 || part.length < 14) && `${last} ${part}`.length <= 300) {
      merged[merged.length - 1] = `${last} ${part}`;
    } else {
      merged.push(part.slice(0, 320));
    }
  }
  return merged.slice(0, 8);
}

function detectLang(text: string): Lang {
  return /[\u0600-\u06FF]/.test(text) ? "ur" : "en";
}

async function fetchBlob(text: string, lang: Lang, emotion: Emotion): Promise<Blob> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("/api/voice-agent/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, emotion }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const blob = await res.blob();
    if (blob.size < 500) throw new Error("tiny audio");
    return blob;
  } finally {
    clearTimeout(timer);
  }
}

/** Live free-slot summary for Sana's check_slots tool. */
async function checkSlotsTool(params?: { date?: string }): Promise<string> {
  try {
    const q = params?.date ? `?date=${encodeURIComponent(params.date)}` : "?days=7";
    const res = await fetch(`/api/voice-agent/availability${q}`);
    const j = (await res.json()) as {
      ok?: boolean;
      date?: string;
      closed?: boolean;
      slots?: Array<{ time: string; booked: boolean }>;
      days?: Array<{ date: string; closed: boolean; slots: Array<{ time: string; booked: boolean }> }>;
      error?: string;
    };
    if (!j.ok) return JSON.stringify({ ok: false, error: "scheduler offline — WhatsApp 0312 3329479 par poochein" });
    if (j.closed) return JSON.stringify({ ok: true, closed: true, message: "Sunday clinic band hai — Monday se slots available hain" });
    if (j.slots) {
      const free = j.slots.filter((s) => !s.booked).map((s) => s.time);
      return JSON.stringify({ ok: true, date: j.date, freeSlots: free, count: free.length });
    }
    if (j.days) {
      const summary = j.days.map((d) => ({
        date: d.date,
        closed: d.closed,
        freeSlots: d.closed ? [] : d.slots.filter((s) => !s.booked).map((s) => s.time),
      }));
      return JSON.stringify({ ok: true, days: summary });
    }
    return JSON.stringify({ ok: false, error: "scheduler gave no data" });
  } catch {
    return JSON.stringify({ ok: false, error: "network error — WhatsApp 0312 3329479 par poochein" });
  }
}

/* ------------------------------------------------------------------ */
/* offline brain (kept for total-network-failure mode)                 */
/* ------------------------------------------------------------------ */

let whatsHintSetter: (() => void) | null = null;

function localBrain(question: string): string {
  const t = question.toLowerCase();
  const ur = /[\u0600-\u06FF]/.test(question);
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has("time", "timing", "hour", "open", "close", "khule", "khol", "waqt", "وقت", "کھل", "اوقات")) {
    return ur
      ? "[warm] ہم پیر سے ہفتہ، صبح دس بجے سے شام سات بجے تک کھلے ہیں۔ اتوار بند رہتا ہے۔"
      : "[warm] We are open Monday to Saturday, 10 AM to 7 PM. Sunday is closed.";
  }
  if (has("where", "address", "location", "pata", "کہاں", "پتہ", "لوکیشن")) {
    return ur
      ? "[warm] TK Dent Bani Gala، اسلام آباد میں House 34-C، Akram Road پر ہے۔ آپ گوگل میپ سے آسانی سے پہنچ سکتے ہیں۔"
      : "[warm] We are at House 34-C, Akram Road, Bani Gala, Islamabad. Directions are on the website footer.";
  }
  if (has("doctor", "tanveer", "khokhar", "surgeon", "ڈاکٹر", "طنویر", "کھوکھر")) {
    return ur
      ? "[warm] ڈاکٹر تنویر کھوکھر ہمارے سینئر Oral and Maxillofacial Surgeon ہیں — FCPS، C-Endo سرٹیفائیڈ، اور ہر کیس ذاتی طور پر دیکھتے ہیں۔"
      : "[warm] Dr. Tanveer Khokhar is our senior oral and maxillofacial surgeon — FCPS qualified and C-Endo certified. He personally plans every case.";
  }
  if (has("book", "appointment", "reserve", "visit", "اپوائنٹ", "بک", "وقت لگوانا")) {
    whatsHintSetter?.();
    return ur
      ? "[excited] بہت خوب! اپوائنٹمنٹ کے لیے WhatsApp کریں 0312 3329479 پر، یا ویب سائٹ کا Book بٹن استعمال کریں۔"
      : "[excited] Wonderful! To book, WhatsApp us on 0312 3329479 or use the Book button on this page.";
  }
  if (has("whiten", "polish", "safai", "صفائی", "وائٹ", "صف")) {
    return ur
      ? "[warm] Whitening اور Polish کی قیمت 15,000 روپے ہے، دو سیشن شامل ہیں۔"
      : "[warm] Whitening and polish is Rs. 15,000 for couple sessions.";
  }
  if (has("aligner", "braces", "brace", "ایلائن", "بریس")) {
    return ur
      ? "[warm] Clear aligners اور braces کے پلانز پانچ ہزار روپے سے شروع ہوتے ہیں۔ تفصیلی قیمت مشاورت پر بتائی جاتی ہے۔"
      : "[warm] Clear aligners and braces plans start from Rs. 5,000. Exact pricing is confirmed on consultation.";
  }
  if (has("implant", "امپلانٹ")) {
    return ur
      ? "[reassuring] ڈینٹل امپلانٹس FCPS سرجن کے ہاتھوں کیے جاتے ہیں۔ قیمت مشاورت پر بتائی جاتی ہے — WhatsApp 0312 3329479۔"
      : "[reassuring] Dental implants are placed by our FCPS surgeon. Pricing is confirmed on consultation — WhatsApp 0312 3329479.";
  }
  if (has("root canal", "rct", "canal", "روٹ", "کانال")) {
    return ur
      ? "[reassuring] ہمارا Root Canal بالکل پین لیس اور سنگل ویزٹ میں ہوتا ہے، C-Endo سرٹیفائیڈ طریقے سے۔"
      : "[reassuring] Our root canals are genuinely painless, single visit, and C-Endo certified.";
  }
  if (has("service", "treatment", "offer", "کام", "علاج", "سروس")) {
    return ur
      ? "[warm] ہم Smile Design، Aligners، Implants، Painless Root Canal، Crowns اور Family Dentistry کرتے ہیں۔ کس کے بارے میں جاننا چاہیں گے؟"
      : "[warm] We offer smile design, aligners, implants, painless root canals, crowns and family dentistry. Which one shall I explain?";
  }
  if (has("whatsapp", "number", "phone", "contact", "نمبر", "فون")) {
    return ur
      ? "[warm] ہمارا نمبر 0312 3329479 ہے — WhatsApp اور کال دونوں چلتے ہیں۔"
      : "[warm] Our number is 0312 3329479 — both WhatsApp and calls work.";
  }
  if (has("thanks", "shukriya", "bye", "خدا", "شکریہ", "الوداع")) {
    return ur
      ? "[warm] شکریہ! مسکراہٹ مضبوط رکھیں — TK Dent ہمیشہ حاضر ہے۔"
      : "[warm] Thank you! Keep smiling — TK Dent is always here for you.";
  }
  if (has("salam", "hello", "hi", "hey", "سلام", "ہیلو")) {
    return ur
      ? "[warm] وعلیکم السلام! بتائیں، آپ کے دانتوں کے بارے میں کیا جاننا ہے؟"
      : "[warm] Hello! How can I help you with your smile today?";
  }
  return ur
    ? "[sorry] یہ سوال میری محدود آف لائن معلومات میں نہیں ہے۔ براہ کرم WhatsApp کریں 0312 3329479 پر۔"
    : "[sorry] That one needs our full assistant online. Please WhatsApp us on 0312 3329479 and the team will reply quickly.";
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function VoiceAgent() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AgentState>("idle");
  const [inputLang, setInputLang] = useState<Lang>("ur");
  const [userLines, setUserLines] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [micHint, setMicHint] = useState("");
  const [voiceInputOk, setVoiceInputOk] = useState(true);
  const [premiumLive, setPremiumLive] = useState(false);
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [whatsHint, setWhatsHint] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const runIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const stateRef = useRef<AgentState>("idle");
  const logRef = useRef<HTMLDivElement | null>(null);
  const thinkingRef = useRef(false);
  const elConvRef = useRef<ElConversation | null>(null);
  const elAgentsRef = useRef<string[]>(DEFAULT_AGENTS);
  const elIdxRef = useRef(0);
  const elFailedRef = useRef(false);
  const elRetryRef = useRef(0);
  const elStartingRef = useRef(false);
  const startSRRef = useRef<(() => void) | null>(null);
  const inputLangRef = useRef<Lang>("ur");
  const voiceInputOkRef = useRef(true);
  const interimRef = useRef("");
  const speakingSinceRef = useRef(0);
  const vadSubmitRef = useRef<{ text: string; at: number } | null>(null);
  const draftRef = useRef<DraftFields>({});
  interface LiveQueue {
    items: QueueItem[];
    lang: Lang;
    closed: boolean;
  }
  const runLiveQueueRef = useRef<((sp: LiveQueue, runId: number) => Promise<void>) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    inputLangRef.current = inputLang;
  }, [inputLang]);
  useEffect(() => {
    voiceInputOkRef.current = voiceInputOk;
  }, [voiceInputOk]);
  useEffect(() => {
    interimRef.current = interim;
  }, [interim]);
  useEffect(() => {
    whatsHintSetter = () => setWhatsHint(true);
    return () => {
      whatsHintSetter = null;
    };
  }, []);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [userLines, interim]);

  /* ---------- shared teardown ---------- */

  const stopVisual = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    barsRef.current.forEach((b) => {
      if (b) b.style.transform = "scaleY(0.3)";
    });
  }, []);

  const stopLegacyAudio = useCallback(() => {
    runIdRef.current += 1;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);

  const endElSession = useCallback(async () => {
    const conv = elConvRef.current;
    elConvRef.current = null;
    setPremiumLive(false);
    try {
      recRef.current?.abort();
      recRef.current = null;
    } catch {}
    if (conv) {
      try {
        await conv.endSession();
      } catch {}
    }
  }, []);

  /* ---------- premium (ElevenLabs ConvAI) session ---------- */

  const startElVisual = useCallback(() => {
    const loop = () => {
      const conv = elConvRef.current;
      if (!conv) return;
      const vol = stateRef.current === "speaking" ? conv.getOutputVolume() : conv.getInputVolume();
      barsRef.current.forEach((b, i) => {
        if (!b) return;
        const centerBoost = 1 - Math.abs(i - 2) * 0.18;
        const v = Math.min(1, Math.max(0.05, vol * 2.4 * centerBoost));
        b.style.transform = `scaleY(${(0.22 + v * 1.6).toFixed(2)})`;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  /** Force-stop the agent's audio the moment the caller interrupts. */
  const interruptPremium = useCallback(() => {
    const conv = elConvRef.current as unknown as
      | { output?: { interrupt?: (reset?: number) => void } }
      | null;
    try {
      conv?.output?.interrupt?.();
    } catch {}
  }, []);

  const startElVoice = useCallback(async (): Promise<boolean> => {
    if (elFailedRef.current || elStartingRef.current) return false;
    elStartingRef.current = true;
    try {
      setState("thinking");
      const { Conversation } = await import("@elevenlabs/client");
      const agentId = elAgentsRef.current[elIdxRef.current] ?? elAgentsRef.current[0];
      // mic permission can hang forever (ignored prompts, headless browsers):
      // race the session against a hard timeout so the panel never freezes
      let adopted = false;
      const sessionP = Conversation.startSession({
        agentId,
        stripAudioTags: true,
        clientTools: {
          check_slots: async (params?: { date?: string }) => checkSlotsTool(params),
          book_appointment: async (params?: Record<string, string>) => {
            const p = params ?? {};
            try {
              const res = await fetch("/api/voice-agent/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: p.name,
                  phone: p.phone,
                  service: p.service,
                  type: p.type === "followup" ? "followup" : "new",
                  date: p.date,
                  timeSlot: p.time,
                  source: "voice-agent",
                }),
              });
              const j = (await res.json()) as {
                ok?: boolean;
                appointment?: { name: string; service: string; type: string; date: string; timeSlot: string };
                error?: string;
                reason?: string;
                free?: string[];
              };
              if (j.ok && j.appointment) {
                setBooking({
                  kind: "booked",
                  appt: {
                    name: j.appointment.name,
                    service: j.appointment.service,
                    type: j.appointment.type,
                    date: j.appointment.date,
                    time: j.appointment.timeSlot,
                  },
                });
                setWhatsHint(false);
                return JSON.stringify({
                  ok: true,
                  ref: j.appointment.name,
                  date: j.appointment.date,
                  time: j.appointment.timeSlot,
                });
              }
              setBooking({ kind: "failed", reason: j.reason ?? j.error });
              return JSON.stringify({ ok: false, error: j.error ?? "slot unavailable", freeSlots: j.free ?? [] });
            } catch {
              setBooking({ kind: "failed", reason: "network" });
              return JSON.stringify({ ok: false, error: "network error" });
            }
          },
        },
        onMessage: (msg: { source: "user" | "ai"; message?: string }) => {
          // voice-only UI: the agent's spoken reply is never shown as text
          const text = (msg.message ?? "").trim();
          if (!text || msg.source !== "user") return;
          setInterim("");
          setUserLines((lines) => {
            if (lines[lines.length - 1] === text) return lines;
            return [...lines.slice(-7), text];
          });
        },
        onModeChange: (prop: { mode: "speaking" | "listening" }) => {
          if (!elConvRef.current) return;
          if (prop.mode === "speaking") {
            speakingSinceRef.current = Date.now();
            setState("speaking");
          } else {
            setState("listening");
          }
        },
        onStatusChange: (prop: {
          status: "connected" | "disconnected" | "connecting" | "disconnecting";
        }) => {
          if (prop.status !== "disconnected" || !elConvRef.current) return;
          void endElSession();
          stopVisual();
          setState("idle");
          // one transparent reconnect attempt with the next agent in the fleet
          if (elRetryRef.current < 2 && elAgentsRef.current.length > 1) {
            elRetryRef.current += 1;
            elIdxRef.current = (elIdxRef.current + 1) % elAgentsRef.current.length;
            setReconnecting(true);
            setTimeout(() => {
              setReconnecting(false);
              void startElVoice();
            }, 900);
          }
        },
        onError: () => {
          elRetryRef.current += 1;
          const canRetry = elRetryRef.current <= elAgentsRef.current.length;
          void endElSession();
          stopVisual();
          setState("idle");
          if (canRetry && elIdxRef.current < elAgentsRef.current.length - 1) {
            elIdxRef.current += 1;
            setReconnecting(true);
            setTimeout(() => {
              setReconnecting(false);
              void startElVoice();
            }, 900);
            return;
          }
          elFailedRef.current = true;
          setMicHint(EL_FAILED_HINT);
          // offline greeting so the panel never feels dead
          if (voiceInputOkRef.current) {
            const items: QueueItem[] = splitSentences(GREETING.replace(EMOTION_RE, "")).map(
              (text) => ({ text, emotion: "warm" as Emotion }),
            );
            void runLiveQueueRef.current?.({ items, lang: "ur", closed: false }, ++runIdRef.current);
          }
        },
      }) as unknown as ElConversation;

      const conv = (await Promise.race([
        Promise.resolve(sessionP),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
      ])) as ElConversation | null;

      if (!conv) {
        // session still dialling in the background — drop it when it lands
        void Promise.resolve(sessionP)
          .then((late: ElConversation) => {
            if (!adopted) {
              late?.endSession?.().catch(() => {});
            }
          })
          .catch(() => {});
        // a hung start means mic trouble in this browser: use legacy mode
        // for the rest of this page view instead of freezing on every turn
        elFailedRef.current = true;
        setMicHint(EL_FAILED_HINT);
        setState("idle");
        return false;
      }
      adopted = true;

      elConvRef.current = conv;
      setPremiumLive(true);
      setMicHint("");
      setState("listening");
      startElVisual();
      return true;
    } catch {
      setState("idle");
      return false;
    } finally {
      elStartingRef.current = false;
    }
  }, [endElSession, startElVisual, stopVisual]);

  /** module-bridge so error handlers can speak the offline greeting */
  const ensureAgents = useCallback(async () => {
    if (elAgentsRef.current.length > 1) return;
    try {
      const res = await fetch("/api/voice-agent/config");
      const j = (await res.json()) as { agentIds?: string[] };
      if (Array.isArray(j.agentIds) && j.agentIds.length > 0) {
        elAgentsRef.current = j.agentIds;
      }
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    void ensureAgents();
  }, [ensureAgents]);

  /* ---------- legacy pipeline: streaming brain + live TTS queue ---------- */

  const playBlob = useCallback((blob: Blob, runId: number) => {
    return new Promise<void>((resolve) => {
      if (runId !== runIdRef.current) return resolve();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  }, []);

  const speakFallback = useCallback((text: string, lang: Lang, emotion: Emotion, runId: number) => {
    return new Promise<void>((resolve) => {
      if (runId !== runIdRef.current) return resolve();
      try {
        const synth = window.speechSynthesis;
        if (!synth) return resolve();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "ur" ? "ur-PK" : "en-US";
        u.rate = emotion === "excited" ? 1.12 : emotion === "sorry" ? 0.88 : 1;
        const voices = synth.getVoices();
        const voice = voices.find((v) =>
          v.lang.toLowerCase().startsWith(lang === "ur" ? "ur" : "en"),
        );
        if (voice) u.voice = voice;
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        u.onend = finish;
        u.onerror = finish;
        synth.speak(u);
        setTimeout(finish, Math.max(6000, text.length * 120));
      } catch {
        resolve();
      }
    });
  }, []);

  const runLiveQueue = useCallback(
    async (sp: LiveQueue, runId: number) => {
      setState("speaking");
      speakingSinceRef.current = Date.now();

      const pref = new Map<number, Promise<Blob | null>>();
      const startFetch = (idx: number) => {
        if (idx >= 0 && idx < sp.items.length && !pref.has(idx)) {
          pref.set(
            idx,
            fetchBlob(sp.items[idx].text, sp.lang, sp.items[idx].emotion).catch(() => null),
          );
        }
      };

      let i = 0;
      for (;;) {
        if (runId !== runIdRef.current) return;
        while (i >= sp.items.length && !sp.closed) {
          await new Promise((r) => setTimeout(r, 60));
          if (runId !== runIdRef.current) return;
        }
        if (i >= sp.items.length) break;
        startFetch(i + 1);
        startFetch(i + 2);
        const item = sp.items[i];
        const blob = await (pref.get(i) ?? Promise.resolve(null));
        if (runId !== runIdRef.current) return;
        if (blob) {
          await playBlob(blob, runId);
        } else {
          await speakFallback(item.text, sp.lang, item.emotion, runId);
        }
        if (runId !== runIdRef.current) return;
        i += 1;
      }

      if (runId === runIdRef.current) {
        setState(elConvRef.current ? "listening" : "idle");
        // hands-free (legacy voice mode only): resume the mic after Sana finishes
        if (!elConvRef.current && voiceInputOkRef.current) {
          setTimeout(() => {
            if (
              runId === runIdRef.current &&
              stateRef.current === "listening" &&
              !recRef.current &&
              !elConvRef.current
            ) {
              startSRRef.current?.();
            }
          }, 900);
        }
      }
    },
    [playBlob, speakFallback],
  );

  runLiveQueueRef.current = runLiveQueue;

  const pushUserTurn = useCallback((text: string) => {
    setUserLines((lines) => {
      if (lines[lines.length - 1] === text) return lines;
      return [...lines.slice(-7), text];
    });
    const lastH = historyRef.current[historyRef.current.length - 1];
    if (!(lastH && lastH.role === "user" && lastH.content === text)) {
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: text },
      ].slice(-12);
    }
  }, []);

  const legacySend = useCallback(
    async (text: string) => {
      thinkingRef.current = true;
      setState("thinking");
      pushUserTurn(text);

      const sp: LiveQueue = { items: [], lang: inputLangRef.current, closed: false };
      const runId = ++runIdRef.current;
      void runLiveQueue(sp, runId);

      try {
        const res = await fetch("/api/voice-agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyRef.current, draft: draftRef.current }),
        });
        if (!res.ok || !res.body) throw new Error("brain failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let raw = "";
        let flushedPtr = 0;
        let emotion: Emotion | null = null;
        let pending = "";

        const flushSentence = (sentence: string) => {
          const t = sentence.trim();
          if (!t) return;
          sp.items.push({ text: t.slice(0, 320), emotion: emotion ?? "neutral" });
        };

        const drainPending = (final: boolean) => {
          for (;;) {
            const idx = Array.from(pending).findIndex((ch) => ".!?؟۔\n".includes(ch));
            if (idx === -1) break;
            flushSentence(pending.slice(0, idx + 1));
            pending = pending.slice(idx + 1);
          }
          if (final && pending.trim()) {
            flushSentence(pending);
            pending = "";
          } else if (pending.length > 220) {
            // safety valve: pathological no-punctuation streams still speak
            flushSentence(pending.slice(0, 320));
            pending = pending.slice(320);
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let ev: {
              type?: string;
              t?: string;
              reply?: string;
              draft?: DraftFields;
              booked?: Record<string, string> | null;
              bookingError?: string;
            };
            try {
              ev = JSON.parse(payload);
            } catch {
              continue;
            }
            if (ev.type === "delta" && ev.t) {
              raw += ev.t;
              if (!emotion) {
                const m = raw.match(EMOTION_RE);
                if (m && EMO_LIST.includes(m[1] as Emotion)) {
                  emotion = m[1] as Emotion;
                }
              }
              const clean = raw.replace(EMOTION_RE, "");
              if (clean.length < flushedPtr) {
                // emotion tag stripped after partial arrival -> restart window
                flushedPtr = 0;
                pending = "";
              }
              pending += clean.slice(flushedPtr);
              flushedPtr = clean.length;
              drainPending(false);
            } else if (ev.type === "meta") {
              // keep the brain's context complete even though Sana's text
              // is never displayed (voice-only UI)
              const spoken = String(ev.reply ?? "").replace(EMOTION_RE, "").trim();
              if (spoken) {
                historyRef.current = [
                  ...historyRef.current,
                  { role: "assistant" as const, content: spoken },
                ].slice(-12);
              }
              if (ev.draft) draftRef.current = ev.draft;
              if (ev.booked) {
                setBooking({
                  kind: "booked",
                  appt: {
                    name: String(ev.booked.name ?? ""),
                    service: String(ev.booked.service ?? ""),
                    type: String(ev.booked.type ?? "new"),
                    date: String(ev.booked.date ?? ""),
                    time: String(ev.booked.timeSlot ?? ev.booked.time ?? ""),
                  },
                });
              } else if (ev.bookingError) {
                setBooking({ kind: "failed", reason: ev.bookingError });
              } else if (ev.draft && Object.values(ev.draft).some(Boolean)) {
                setBooking({ kind: "collecting", fields: ev.draft });
              }
            }
          }
        }
        drainPending(true);
        sp.closed = true;
      } catch {
        sp.closed = true;
        stopLegacyAudio();
        const reply = localBrain(text);
        const plain = reply.replace(EMOTION_RE, "").trim();
        setMicHint("");
        const items: QueueItem[] = splitSentences(plain).map((s) => ({ text: s, emotion: "warm" }));
        void runLiveQueueRef.current?.({ items, lang: inputLangRef.current, closed: true }, ++runIdRef.current);
      } finally {
        thinkingRef.current = false;
        sp.closed = true;
      }
    },
    [pushUserTurn, runLiveQueue, stopLegacyAudio],
  );

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || thinkingRef.current) return;
      stopLegacyAudio();
      setInterim("");
      setWhatsHint(false);

      // 1) premium session live? forward text (interrupt current speech first)
      if (elConvRef.current) {
        interruptPremium();
        setState("thinking");
        pushUserTurn(text);
        try {
          elConvRef.current.sendUserMessage(text);
          return;
        } catch {
          await endElSession();
        }
      }

      // 2) premium not tried yet? open session (Reva greets, then reads the text)
      if (!elFailedRef.current && !elStartingRef.current) {
        setState("thinking");
        const ok = await startElVoice();
        if (ok && elConvRef.current) {
          pushUserTurn(text);
          setTimeout(() => {
            try {
              elConvRef.current?.sendUserMessage(text);
            } catch {}
          }, 2400);
          return;
        }
        await endElSession();
      }

      // 3) legacy pipeline (streaming brain + TTS queue)
      setMicHint(elFailedRef.current ? EL_FAILED_HINT : "");
      void legacySend(text);
    },
    [endElSession, interruptPremium, legacySend, pushUserTurn, startElVoice, stopLegacyAudio],
  );

  /* ---------- mic (local SpeechRecognition + VAD + barge-in) ---------- */

  const startSR = useCallback(() => {
    const Ctor = (
      window as unknown as {
        SpeechRecognition?: SRCtor;
        webkitSpeechRecognition?: SRCtor;
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition;

    if (!Ctor) {
      setVoiceInputOk(false);
      setMicHint("Is browser mein voice input support nahi — text se poochein.");
      return;
    }
    if (recRef.current) return;

    const rec = new Ctor();
    rec.lang = inputLangRef.current === "ur" ? "ur-PK" : "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SRResultEvent) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) {
          const finalText = r[0].transcript.trim();
          if (!finalText) continue;
          // VAD already submitted this utterance? swallow the duplicate final.
          const sub = vadSubmitRef.current;
          if (sub && Date.now() - sub.at < 3000 && (finalText.includes(sub.text) || sub.text.includes(finalText))) {
            continue;
          }
          vadSubmitRef.current = null;
          void sendMessage(finalText);
          return;
        }
        interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (e: SRErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceInputOk(false);
        setMicHint(MIC_DENIED);
        stopVisual();
        setState("idle");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setInterim("");
      if (stateRef.current === "listening" && voiceInputOkRef.current && !elConvRef.current) {
        setTimeout(() => {
          if (stateRef.current === "listening" && !recRef.current && !elConvRef.current) {
            startSRRef.current?.();
          }
        }, 350);
      }
    };
    try {
      rec.start();
      recRef.current = rec;
    } catch {
      recRef.current = null;
    }
  }, [sendMessage, stopVisual]);
  startSRRef.current = startSR;

  /* ---------- mic visualizer + VAD fast-submit + instant barge-in ---------- */

  const startVisual = useCallback(async () => {
    if (ctxRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.55;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let loudFrames = 0;
      let silenceFrames = 0;
      let speechSeen = false;
      let lastFrame = performance.now();

      const loop = () => {
        if (!ctxRef.current) return;
        analyser.getByteFrequencyData(data);
        barsRef.current.forEach((b, i) => {
          if (!b) return;
          const v = data[3 + i * 5] / 255;
          b.style.transform = `scaleY(${(0.22 + v * 1.6).toFixed(2)})`;
        });

        const now = performance.now();
        const dt = Math.min(80, now - lastFrame);
        lastFrame = now;

        let sum = 0;
        for (let i = 2; i < 10; i += 1) sum += data[i];
        const rms = sum / (8 * 255);

        const st = stateRef.current;
        if (st === "speaking") {
          silenceFrames = 0;
          if (now - speakingSinceRef.current > BARGE_GRACE_MS && rms > BARGE_RMS) {
            loudFrames += 1;
            if (loudFrames >= BARGE_FRAMES) {
              loudFrames = 0;
              // user started talking over Sana -> cut audio, listen immediately
              stopLegacyAudio();
              setState("listening");
              startSRRef.current?.();
            }
          } else {
            loudFrames = 0;
          }
        } else if (st === "listening") {
          if (rms > SPEAK_RMS) {
            speechSeen = true;
            silenceFrames = 0;
          } else if (speechSeen && interimRef.current.trim().length >= 2) {
            silenceFrames += dt / 16.7;
            if (silenceFrames >= SILENCE_FRAMES) {
              silenceFrames = 0;
              speechSeen = false;
              const text = interimRef.current.trim();
              if (text && !thinkingRef.current) {
                vadSubmitRef.current = { text, at: Date.now() };
                setInterim("");
                void sendMessage(text);
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      barsRef.current.forEach((b, i) => {
        if (b) b.classList.add("va-bar-fallback");
      });
    }
  }, [sendMessage, stopLegacyAudio]);

  const stopListening = useCallback(() => {
    try {
      recRef.current?.abort();
      recRef.current = null;
    } catch {}
    stopVisual();
    if (stateRef.current === "listening") setState("idle");
  }, [stopVisual]);

  const startListening = useCallback(() => {
    stopLegacyAudio();
    setInterim("");
    setMicHint("");
    setState("listening");

    void (async () => {
      // premium path: the session owns the mic (ElevenLabs ASR + Reva voice)
      if (!elFailedRef.current) {
        const ok = await startElVoice();
        if (ok) return;
        await endElSession();
      }

      const Ctor = (
        window as unknown as {
          SpeechRecognition?: SRCtor;
          webkitSpeechRecognition?: SRCtor;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition;
      if (!Ctor) {
        setVoiceInputOk(false);
        setMicHint("Is browser mein voice input support nahi — text se poochein.");
        setState("idle");
        return;
      }
      setMicHint(EL_FAILED_HINT);
      void startVisual();
      startSR();
    })();
  }, [endElSession, startElVoice, startSR, startVisual, stopLegacyAudio]);

  const endVoiceSession = useCallback(() => {
    stopLegacyAudio();
    stopVisual();
    void endElSession();
    setState("idle");
    setInterim("");
  }, [endElSession, stopLegacyAudio, stopVisual]);

  /* ---------- greeting + cleanup ---------- */

  const openPanel = useCallback(() => {
    setOpen(true);
    // pre-connect immediately: Sana greets while the caller settles,
    // so the first question has zero wait
    void (async () => {
      await ensureAgents();
      if (!elFailedRef.current && !elConvRef.current) {
        const ok = await startElVoice();
        if (!ok) {
          await endElSession();
        }
      }
    })();
  }, [endElSession, ensureAgents, startElVoice]);

  const closePanel = useCallback(() => {
    stopLegacyAudio();
    stopListening();
    void endElSession();
    // fresh start on next open — purge stale booking draft/history
    // (bug: Sana resumed "booking kara deti hoon" from a previous session)
    historyRef.current = [];
    draftRef.current = {};
    setUserLines([]);
    setBooking(null);
    setOpen(false);
  }, [endElSession, stopLegacyAudio, stopListening]);

  useEffect(() => {
    return () => {
      stopLegacyAudio();
      stopVisual();
      void endElSession();
    };
  }, [endElSession, stopLegacyAudio, stopVisual]);

  /* ---------- render ---------- */

  const statusText = reconnecting
    ? "Dobara connect ho rahi hoon..."
    : state === "listening"
      ? "Sun rahi hoon — boliye!"
      : state === "thinking"
        ? "Soch rahi hoon..."
        : state === "speaking"
          ? "Bol rahi hoon — beech me bol kar rok saktay hain"
          : premiumLive
            ? "Connected — boliye ya likhiye"
            : "Boliye ya likhiye — jawab awaz mein milega";

  const orbStyle = { bottom: "calc(1.15rem + env(safe-area-inset-bottom))", right: "1.15rem" };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        aria-label="TK Dent voice assistant kholen"
        className="va-orb fixed z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal to-[#07272B] text-white shadow-xl transition-transform duration-300 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal sm:h-16 sm:w-16"
        style={orbStyle}
      >
        <AudioLines className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="TK Dent voice assistant Sana"
      className="fixed z-[80] w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-teal/25 bg-white/90 shadow-2xl backdrop-blur-xl"
      style={orbStyle}
    >
      {/* header */}
      <header className="flex items-center gap-3 border-b border-teal/15 bg-gradient-to-r from-teal/10 to-mint/20 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal to-[#07272B] text-white">
          <AudioLines className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight text-ink">Sana</span>
          <span className="block truncate text-[11px] leading-tight text-muted-ink">
            {premiumLive ? "TK Dent Voice Assistant · Premium" : "TK Dent Voice Assistant"}
          </span>
        </span>
        <div
          className="flex items-center gap-1 rounded-full border border-teal/25 bg-white/70 p-0.5"
          role="group"
          aria-label="Boli jani wali zuban"
        >
          {(["ur", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setInputLang(l)}
              aria-pressed={inputLang === l}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
                inputLang === l ? "bg-teal text-white" : "text-muted-ink hover:text-teal"
              }`}
            >
              {l === "ur" ? "اردو" : "EN"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Assistant band karein"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-teal/10 hover:text-teal"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* status zone (voice-only: no agent transcript) */}
      <div className="flex flex-col items-center gap-3 px-4 pb-3 pt-5">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-all duration-300 ${
              state === "speaking"
                ? "bg-gradient-to-br from-teal to-[#0B6B63] shadow-lg shadow-teal/40 scale-105"
                : state === "listening"
                  ? "bg-gradient-to-br from-teal to-[#07272B] va-orb"
                  : "bg-gradient-to-br from-teal to-[#07272B]"
            }`}
          >
            {state === "listening" ? (
              <Mic className="h-5 w-5" aria-hidden="true" />
            ) : state === "thinking" ? (
              <Sparkles className="h-5 w-5 animate-pulse" aria-hidden="true" />
            ) : (
              <AudioLines className="h-5 w-5" aria-hidden="true" />
            )}
          </span>

          <span className="flex h-9 items-end gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                className={`w-1.5 rounded-full bg-teal transition-[height] ${
                  state === "listening" || state === "speaking" ? "h-8" : "h-2 opacity-40"
                }`}
                style={{ transform: "scaleY(0.3)", transformOrigin: "center bottom" }}
              />
            ))}
          </span>
        </div>

        <p className="text-xs font-semibold text-muted-ink" aria-hidden="true">
          {statusText}
        </p>

        {/* only the caller's own words appear here — never Sana's reply */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className="min-h-[2.5rem] w-full rounded-2xl bg-mint/25 px-3 py-2 text-center text-[13px] font-medium leading-snug text-ink"
        >
          {interim || (state === "speaking" ? "· · ·" : userLines[userLines.length - 1] || "…")}
        </p>
      </div>

      {/* caller's own words (input log only) */}
      {userLines.length > 0 && (
        <div
          ref={logRef}
          role="log"
          aria-label="Aap ki baat-cheet"
          className="max-h-24 overflow-y-auto border-y border-teal/15 bg-white/50 px-4 py-2 va-scroll"
        >
          {userLines.map((t, i) => (
            <p key={i} className="py-0.5 text-[12px] leading-snug text-muted-ink">
              <span className="font-bold text-ink">Aap:</span> {t}
            </p>
          ))}
        </div>
      )}

      {/* live booking status */}
      {booking?.kind === "collecting" && (
        <div className="mx-3 my-2 rounded-2xl border border-teal/20 bg-mint/20 px-3 py-2.5">
          <p className="flex items-center gap-2 text-[12px] font-bold text-ink">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" aria-hidden="true" />
            Appointment details collect ho rahi hain...
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {(
              [
                ["Naam", booking.fields.name],
                ["Phone", booking.fields.phone],
                ["Service", booking.fields.service],
                ["Visit", booking.fields.type === "followup" ? "Follow-up" : booking.fields.type ? "Naya" : ""],
                ["Din/Waqt", booking.fields.date ? `${booking.fields.date} ${booking.fields.time ?? ""}` : ""],
              ] as Array<[string, string | undefined]>
            ).map(([label, val]) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  val ? "bg-teal text-white" : "bg-white/70 text-muted-ink"
                }`}
              >
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                {label}
                {val ? `: ${val}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {booking?.kind === "booked" && (
        <div className="mx-3 my-2 rounded-2xl border border-teal/30 bg-gradient-to-br from-teal to-[#0B6B63] px-3.5 py-3 text-white shadow-md">
          <p className="flex items-center gap-2 text-[13px] font-extrabold">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            Appointment pakka ho gaya!
          </p>
          <p className="mt-1 text-[12px] leading-snug text-white/90">
            {booking.appt.name} · {booking.appt.service} ·{" "}
            {booking.appt.type === "followup" ? "Follow-up" : "Naya patient"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {booking.appt.date}
            <Clock className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            {booking.appt.time}
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-teal-2 transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp par bhi confirm karein
          </a>
        </div>
      )}

      {(booking?.kind === "failed" || whatsHint) && (
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal to-[#0B6B63] px-4 py-2.5 text-[12px] font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp par appointment book karein
        </a>
      )}

      {/* controls */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => {
            if (premiumLive) {
              if (state === "speaking") {
                interruptPremium();
                setState("listening");
              } else {
                endVoiceSession();
              }
            } else if (state === "speaking") {
              stopLegacyAudio();
              setState("idle");
            } else {
              startListening();
            }
          }}
          disabled={state === "thinking"}
          aria-label={
            premiumLive
              ? state === "speaking"
                ? "Sana ko rokein"
                : "Voice chat band karein"
              : "Mic se baat karein"
          }
          aria-pressed={premiumLive}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white shadow-md transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "speaking" ? (
            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              void sendMessage(draft);
              setDraft("");
            }
          }}
          placeholder={state === "speaking" ? "Sana bol rahi hai..." : "Apna sawal likhein..."}
          aria-label="Apna sawal likhein"
          disabled={state === "thinking"}
          className="h-11 min-w-0 flex-1 rounded-full border border-teal/30 bg-white px-4 text-sm text-ink placeholder:text-muted-ink/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25 disabled:opacity-50"
        />

        {state === "speaking" && !premiumLive ? (
          <button
            type="button"
            onClick={() => {
              stopLegacyAudio();
              setState("idle");
            }}
            aria-label="Jawab rok dein"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#07272B] text-white shadow-md transition-all hover:scale-105"
          >
            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (draft.trim()) {
                void sendMessage(draft);
                setDraft("");
              }
            }}
            disabled={!draft.trim() || state === "thinking"}
            aria-label="Sawal bhejein"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white shadow-md transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {(micHint || !voiceInputOk) && (
        <p className="px-4 pb-2 text-center text-[11px] leading-snug text-teal">{micHint}</p>
      )}

      <p className="border-t border-teal/10 bg-white/40 py-1.5 text-center text-[10px] tracking-wide text-muted-ink/70">
        TK DENT VOICE AI · BY SYNKREW
      </p>
    </section>
  );
}
