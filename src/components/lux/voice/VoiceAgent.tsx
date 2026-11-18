"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, MessageCircle, Mic, Send, Sparkles, Square, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* types + constants                                                   */
/* ------------------------------------------------------------------ */

type AgentState = "idle" | "listening" | "thinking" | "speaking";
type Lang = "ur" | "en";
type Emotion = "neutral" | "warm" | "reassuring" | "excited" | "sorry";
interface Turn {
  who: "you" | "sana";
  text: string;
}
interface QueueItem {
  text: string;
  emotion: Emotion;
}

const EL_AGENT_ID = "agent_7801m7qwj5qke8jr2vfnd8svng6x"; // Sana — ElevenLabs ConvAI (public agent)

const GREETING =
  "[warm] السلام علیکم! میں ثنا ہوں، ٹی کے ڈینٹ کی وائس اسسٹنٹ۔ آپ آواز سے یا لکھ کر ٹریٹمنٹس، اوقات یا اپوائنٹمنٹ کے بارے میں پوچھ سکتے ہیں۔";
const WHATSAPP_URL =
  "https://wa.me/923123329479?text=" +
  encodeURIComponent("Assalam o Alaikum! Main appointment book karna chah raha/chah rahi hoon.");
const MIC_DENIED =
  "Mic ki permission nahi mili — aap text se bhi pooch saktay hain.";
const EL_FAILED_HINT =
  "Premium voice busy hai — offline mode chal raha hai.";

const EMOTION_RE = /^\s*\[(warm|reassuring|excited|neutral|sorry)\]/i;
const EMO_LIST: Emotion[] = ["warm", "reassuring", "excited", "neutral", "sorry"];
/** booking intent in an agent reply -> surface the WhatsApp handoff chip */
const BOOKING_RE =
  /\b(book|booking|booked|appointment|appointments|reserve)\b|اپوائنٹمنٹ|بکروانا|بک کر|بک رہا|بک جا/i;

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
  return merged.slice(0, 6);
}

function parseReply(reply: string): { items: QueueItem[]; plain: string } {
  const match = reply.match(EMOTION_RE);
  const emotion = (match && EMO_LIST.includes(match[1] as Emotion) ? match[1] : "neutral") as Emotion;
  const plain = reply.replace(EMOTION_RE, "").trim();
  const items = splitSentences(plain).map((text) => ({ text, emotion }));
  return { items, plain };
}

function detectLang(text: string): Lang {
  return /[\u0600-\u06FF]/.test(text) ? "ur" : "en";
}

/**
 * Offline fallback brain — keeps the voice agent useful even when the
 * LLM route or TTS service is unreachable (e.g. static hosting).
 * Mirrors the clinic facts and the caller's language script.
 */
function localBrain(question: string): string {
  const t = question.toLowerCase();
  const ur = /[\u0600-\u06FF]/.test(question);
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has("time", "timing", "hour", "open", "close", "khule", "khol", "waqt", "وقت", "کھل", "اوقات")) {
    return ur
      ? "[warm] ہم پیر سے ہفتہ، صبح دس بجے سے شام سات بجے تک کھلے ہیں۔ اتوار بند رہتا ہے۔"
      : "[warm] We are open Monday to Saturday, 10 AM to 7 PM. Sunday is closed.";
  }
  if (has("where", "address", "location", "pata", "address", "کہاں", "پتہ", "لوکیشن")) {
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
    setBookFlagExternal();
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

/** module-level hook so localBrain can surface booking intent */
let bookFlagSetter: (() => void) | null = null;
function setBookFlagExternal(): void {
  bookFlagSetter?.();
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

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function VoiceAgent() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AgentState>("idle");
  const [inputLang, setInputLang] = useState<Lang>("ur");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [micHint, setMicHint] = useState("");
  const [voiceInputOk, setVoiceInputOk] = useState(true);
  const [bookHint, setBookHint] = useState(false);
  const [premiumMode, setPremiumMode] = useState<"off" | "voice" | "text">("off");

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
  const elTextOnlyRef = useRef(false);
  const premiumFailedRef = useRef(false);
  const startSRRef = useRef<(() => void) | null>(null);
  const inputLangRef = useRef<Lang>("ur");
  const voiceInputOkRef = useRef(true);

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
    bookFlagSetter = () => setBookHint(true);
    return () => {
      bookFlagSetter = null;
    };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turns, interim, caption]);

  /* ---------- ElevenLabs premium session ---------- */

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

  const endElSession = useCallback(async () => {
    const conv = elConvRef.current;
    elConvRef.current = null;
    elTextOnlyRef.current = false;
    setPremiumMode("off");
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

  /** rAF loop driving the waveform from the ElevenLabs session volumes (premium audio mode) */
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

  const startElVoice = useCallback(async (): Promise<boolean> => {
    if (premiumFailedRef.current) return false;
    try {
      setState("thinking");
      const { Conversation } = await import("@elevenlabs/client");
      const conv = (await Conversation.startSession({
        agentId: EL_AGENT_ID,
        // Full audio session — the agent speaks with its native female Urdu
        // voice (Reva) and handles mic ASR internally. stripAudioTags keeps
        // expressive tags like [happy] out of the visible transcript.
        stripAudioTags: true,
        onMessage: (msg: { source: "user" | "ai"; message?: string }) => {
          const text = (msg.message ?? "").trim();
          if (!text) return;
          setTurns((t) => {
            const last = t[t.length - 1];
            if (last && last.who === (msg.source === "ai" ? "sana" : "you") && last.text === text)
              return t;
            return [...t, { who: msg.source === "ai" ? "sana" : "you", text }];
          });
          if (msg.source === "ai" && BOOKING_RE.test(text)) setBookHint(true);
        },
        onModeChange: (prop: { mode: "speaking" | "listening" }) => {
          if (!elConvRef.current) return;
          setState(prop.mode === "speaking" ? "speaking" : "listening");
          if (prop.mode === "listening") setCaption("");
        },
        onStatusChange: (prop: {
          status: "connected" | "disconnected" | "connecting" | "disconnecting";
        }) => {
          if (prop.status === "disconnected" && elConvRef.current) {
            void endElSession();
            setState("idle");
            stopVisual();
          }
        },
        onError: () => {
          // quota exhausted / network issue -> mark premium as failed for this page view
          premiumFailedRef.current = true;
          void endElSession();
          stopVisual();
          setState("idle");
          setMicHint(EL_FAILED_HINT);
        },
      })) as unknown as ElConversation;

      elConvRef.current = conv;
      elTextOnlyRef.current = false;
      setPremiumMode("voice");
      setMicHint("");
      setState("listening");
      startElVisual();
      return true;
    } catch {
      return false;
    }
  }, [endElSession, startElVisual, stopVisual]);

  /* ---------- legacy pipeline (brain route + TTS route) ---------- */

  const stopAll = useCallback(() => {
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
    // pause mic recognition while Sana speaks (prevents echo/barge-in feedback)
    try {
      recRef.current?.abort();
      recRef.current = null;
    } catch {}
  }, []);

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

  const speakFallback = useCallback(
    (text: string, lang: Lang, emotion: Emotion, runId: number) => {
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
    },
    [],
  );

  const runQueue = useCallback(
    async (items: QueueItem[], lang: Lang) => {
      const runId = ++runIdRef.current;
      setState("speaking");

      interface Job {
        item: QueueItem;
        blobP: Promise<Blob | null> | null;
      }
      const jobs: Job[] = items.map((item) => ({ item, blobP: null }));
      const startFetch = (idx: number) => {
        if (idx >= 0 && idx < jobs.length && !jobs[idx].blobP) {
          jobs[idx].blobP = fetchBlob(jobs[idx].item.text, lang, jobs[idx].item.emotion).catch(
            () => null,
          );
        }
      };
      startFetch(0);
      startFetch(1);

      for (let i = 0; i < jobs.length; i += 1) {
        if (runId !== runIdRef.current) return;
        startFetch(i + 2);
        setCaption(jobs[i].item.text);
        const blob = await jobs[i].blobP;
        if (runId !== runIdRef.current) return;

        if (blob) {
          await playBlob(blob, runId);
        } else {
          await speakFallback(jobs[i].item.text, lang, jobs[i].item.emotion, runId);
        }
        if (runId !== runIdRef.current) return;
      }

      if (runId === runIdRef.current) {
        setState(elConvRef.current ? "listening" : "idle");
        setCaption("");
        // hands-free (legacy voice mode only): resume the mic after Sana finishes;
        // never while a premium session is live (the SDK owns the mic then)
        if (!elConvRef.current && premiumFailedRef.current && voiceInputOkRef.current) {
          setTimeout(() => {
            if (
              runId === runIdRef.current &&
              stateRef.current === "listening" &&
              !recRef.current
            ) {
              startSRRef.current?.();
            }
          }, 900);
        }
      }
    },
    [playBlob, speakFallback],
  );

  const speakReply = useCallback(
    (reply: string) => {
      const { items, plain } = parseReply(reply);
      const lang = detectLang(plain);
      setTurns((t) => [...t, { who: "sana", text: plain }]);
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant" as const, content: plain },
      ].slice(-12);
      if (items.length > 0) {
        void runQueue(items, lang);
      } else {
        setState("idle");
      }
    },
    [runQueue],
  );

  const pushUserTurn = useCallback((text: string) => {
    setTurns((t) => {
      const last = t[t.length - 1];
      if (last && last.who === "you" && last.text === text) return t;
      return [...t, { who: "you" as const, text }];
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
      try {
        const res = await fetch("/api/voice-agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyRef.current }),
        });
        const data = (await res.json()) as { reply?: string; error?: string; booking?: boolean };
        if (!res.ok || !data.reply) throw new Error(data.error ?? "brain failed");
        if (data.booking) setBookHint(true);
        speakReply(data.reply);
      } catch {
        setMicHint("");
        speakReply(localBrain(text));
      } finally {
        thinkingRef.current = false;
      }
    },
    [pushUserTurn, speakReply],
  );

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || thinkingRef.current) return;
      stopAll();
      setInterim("");
      setCaption("");
      setBookHint(false);

      // 1) premium session already live? just forward the text
      if (elConvRef.current) {
        setState("thinking");
        pushUserTurn(text);
        try {
          elConvRef.current.sendUserMessage(text);
          return;
        } catch {
          await endElSession();
        }
      }

      // 2) try starting a premium session (Reva voice; legacy on failure)
      if (!premiumFailedRef.current) {
        setState("thinking");
        const ok = await startElVoice();
        if (ok && elConvRef.current) {
          // the agent speaks its Urdu greeting; forward the question after it
          setTimeout(() => {
            try {
              elConvRef.current?.sendUserMessage(text);
            } catch {}
          }, 2200);
          return;
        }
        await endElSession();
      }

      // 3) legacy pipeline (pushes its own user turn)
      setMicHint(premiumFailedRef.current ? EL_FAILED_HINT : "");
      void legacySend(text);
    },
    [endElSession, legacySend, pushUserTurn, startElVoice, stopAll],
  );

  /* ---------- mic (local SpeechRecognition -> premium text-only brain) ---------- */

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
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) {
          const finalText = r[0].transcript.trim();
          if (finalText) {
            void sendMessage(finalText);
            return;
          }
        } else {
          interim += r[0].transcript;
        }
      }
      setInterim(interim);
    };
    rec.onerror = (e: SRErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceInputOk(false);
        setMicHint(MIC_DENIED);
        stopVisual();
        setState("idle");
      }
      // no-speech / audio-capture hiccups: recognition cycles via onend
    };
    rec.onend = () => {
      recRef.current = null;
      setInterim("");
      if (stateRef.current === "listening" && voiceInputOkRef.current) {
        // keep the mic alive while the session is open
        setTimeout(() => {
          if (stateRef.current === "listening" && !recRef.current) startSRRef.current?.();
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

  /* ---------- mic + visualizer (legacy listening path) ---------- */

  const startVisual = useCallback(async () => {
    if (ctxRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!ctxRef.current) return;
        analyser.getByteFrequencyData(data);
        barsRef.current.forEach((b, i) => {
          if (!b) return;
          const v = data[3 + i * 5] / 255;
          b.style.transform = `scaleY(${(0.22 + v * 1.6).toFixed(2)})`;
        });
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      barsRef.current.forEach((b, i) => {
        if (b) b.classList.add("va-bar-fallback");
      });
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recRef.current?.abort();
      recRef.current = null;
    } catch {}
    stopVisual();
    if (stateRef.current === "listening") setState("idle");
  }, [stopVisual]);

  const startListening = useCallback(() => {
    const Ctor = (
      window as unknown as {
        SpeechRecognition?: SRCtor;
        webkitSpeechRecognition?: SRCtor;
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition;

    stopAll();
    setCaption("");
    setInterim("");
    setMicHint("");
    setState("listening");

    void (async () => {
      // premium path: the session owns the mic (ElevenLabs ASR + Reva voice)
      if (!premiumFailedRef.current) {
        const ok = await startElVoice();
        if (ok) return;
        await endElSession();
      }

      // premium unavailable (quota/network) -> local speech recognition + legacy pipeline
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
  }, [endElSession, startElVoice, startSR, startVisual, stopAll]);

  const endVoiceSession = useCallback(() => {
    stopAll();
    stopVisual();
    void endElSession();
    setState("idle");
    setCaption("");
  }, [endElSession, stopAll, stopVisual]);

  /* ---------- greeting + cleanup ---------- */

  const openPanel = useCallback(() => {
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    stopAll();
    stopListening();
    void endElSession();
    setOpen(false);
  }, [endElSession, stopAll, stopListening]);

  useEffect(() => {
    return () => {
      stopAll();
      stopVisual();
      void endElSession();
    };
  }, [endElSession, stopAll, stopVisual]);

  /* ---------- render ---------- */

  const statusText =
    state === "listening"
      ? "Sun rahi hoon — boliye!"
      : state === "thinking"
        ? "Soch rahi hoon..."
        : state === "speaking"
          ? "Jawab de rahi hoon — rokne ke liye mic dabayen"
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
            {premiumMode === "voice" ? "TK Dent Voice Assistant · Premium" : "TK Dent Voice Assistant"}
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

      {/* status zone */}
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

        <p
          aria-live="polite"
          aria-atomic="true"
          className="min-h-[2.5rem] w-full rounded-2xl bg-mint/25 px-3 py-2 text-center text-[13px] font-medium leading-snug text-ink"
        >
          {caption || interim || "…"}
        </p>
      </div>

      {/* transcript */}
      <div
        ref={logRef}
        role="log"
        aria-label="Baat cheet ka record"
        className="max-h-32 overflow-y-auto border-y border-teal/15 bg-white/50 px-4 py-2 va-scroll"
      >
        {turns.length === 0 && interim === "" ? (
          <p className="py-2 text-center text-[11px] text-muted-ink">
            Mic dabayen aur boliye — Sana khud salam karegi, ya sawal likhein.
          </p>
        ) : (
          turns.map((t, i) => (
            <p key={i} className="py-0.5 text-[12px] leading-snug text-muted-ink">
              <span className={`font-bold ${t.who === "you" ? "text-ink" : "text-teal"}`}>
                {t.who === "you" ? "Aap:" : "Sana:"}
              </span>{" "}
              {t.text}
            </p>
          ))
        )}
        {interim && (
          <p className="py-0.5 text-[12px] italic leading-snug text-muted-ink/70">
            <span className="font-bold text-ink">Aap:</span> {interim}…
          </p>
        )}
      </div>

      {/* booking handoff */}
      {bookHint && (
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
            if (premiumMode === "voice") {
              endVoiceSession();
            } else {
              startListening();
            }
          }}
          disabled={state === "thinking"}
          aria-label={premiumMode === "voice" ? "Voice chat band karein" : "Mic se baat karein"}
          aria-pressed={premiumMode === "voice"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white shadow-md transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {premiumMode === "voice" ? (
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

        {state === "speaking" && premiumMode !== "voice" ? (
          <button
            type="button"
            onClick={() => {
              stopAll();
              setState("idle");
              setCaption("");
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
