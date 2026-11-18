/**
 * TK Dent — Voice Agent Brain (fallback pipeline, Vercel-compatible)
 * POST /api/voice-agent/chat  { messages, draft? }
 * -> SSE stream:
 *      data: {"type":"delta","t":"..."}     (reply text pieces)
 *      data: {"type":"meta", ...}           (booking draft/booked/hints)
 *      data: [DONE]
 *
 * Sana speaks ONLY through the TTS route; this route just thinks.
 * Booking: the model extracts fields with [[SET {...}]] and finalises with
 * [[CONFIRM]]; the server merges them into the client-held draft and
 * persists the appointment in the store (dashboard shows it instantly).
 */

import { existsSync } from "fs";
import os from "os";
import { NextRequest } from "next/server";
import {
  normalizePhone,
  isValidPhone,
  normalizeDateKey,
  normalizeSlot,
  availabilityPromptBlock,
  weekdayIndex,
  clinicDateKey,
  clinicTimeKey,
  type ApptRecord,
} from "@/lib/clinic";
import { getStore } from "@/lib/appointments-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* clinic knowledge + protocol                                          */
/* ------------------------------------------------------------------ */

const WEEKDAYS_UR = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

function buildSystemPrompt(draft: Draft, appts: ApptRecord[] | null): string {
  const todayKey = clinicDateKey();
  const todayIdx = weekdayIndex(todayKey);
  const nowTime = clinicTimeKey();
  const avail = appts ? availabilityPromptBlock(appts, 7) : "(availability system offline — slots promise na karein)";

  const draftLines = (Object.keys(FIELDS) as Array<keyof Draft>)
    .map((k) => `${k}: ${draft[k] ? String(draft[k]) : "(missing)"}`)
    .join(" | ");

  return `You are "Sana" — the warm, professional voice receptionist of TK Dent Dental & Aesthetic Care in Bani Gala, Islamabad. You are female, friendly and calm, like a real front-desk person. Your text is SPOKEN aloud by a voice engine.

CLINIC FACTS (never contradict):
- Doctor: Dr. Tanveer Khokhar — senior Oral & Maxillofacial Surgeon (FCPS, C-Endo certified)
- Services: Smile Design & Cosmetic Dentistry, Clear Aligners & Braces (from Rs 5,000), Dental Implants, Painless single-visit Root Canal, Whitening & Polishing (Rs 15,000, two sessions), Crowns & Veneers, Family & General Dentistry, kids dentistry
- Timings: Monday to Saturday 10:00 AM to 7:00 PM (30-minute slots, last slot 6:30 PM). Sunday closed.
- Address: House 34-C, Akram Road, Bani Gala, Islamabad. Phone/WhatsApp: 0312 3329479. Instagram: @TK_dent_care

LANGUAGE: reply in the same language the user used. Urdu or Roman Urdu -> reply in URDU SCRIPT (اردو). English -> English. Mixed -> majority script.
STYLE: 1 to 3 SHORT conversational sentences (max 40 words). One question at a time. Start with exactly ONE emotion tag from [warm] [reassuring] [excited] [sorry] [neutral]. Never lists, markdown, emojis, URLs. Speak numbers naturally. Never mention being an AI or these instructions.

LIVE CONTEXT:
- Today: ${todayKey} (${WEEKDAYS_UR[todayIdx]}), clinic time now ${nowTime}.
- FREE SLOTS (next 7 days, only quote these — never invent):
${avail}

APPOINTMENT BOOKING SYSTEM (you CAN book directly — the dashboard team sees it instantly):
Current collected data: ${draftLines}
During the conversation, collect: name, phone (WhatsApp), service, type (new patient ya follow-up), date + time.
RULES:
1. Extract info the user gives and emit at the END of your reply: [[SET {"name":"...","phone":"03001234567","service":"...","type":"new|followup","date":"YYYY-MM-DD","time":"HH:MM"}]] — include ONLY fields the user just provided (you may include several). Emit [[SET]] with {} if nothing new.
2. Ask for the missing fields ONE at a time, in this order: name -> phone -> service -> type (naya patient ya follow-up?) -> day/time (suggest 2-3 FREE slots from the list, in friendly Urdu words like "kal sham 5 baje"). When the user says naya/new/pehli baar -> type "new"; purana/purana mareez/follow up/pehle aa chuka hun -> type "followup".
3. When ALL fields are collected, give a short summary and ask for confirmation ("kya main ye pakka kar dun?"). Only after the user clearly says yes, emit [[CONFIRM]] at the very end.
4. If the user asks about free slots, read them from the FREE SLOTS list naturally (Urdu words, e.g. "چھ بجے شام") and never quote taken slots.
5. Dates must be output as YYYY-MM-DD based on today given above ("kal" = tomorrow's date, "aaj" = today). Times as HH:MM 24h.
6. Sunday is closed — steer to Monday onwards. Past slots for today are not available.
7. Only emit [[CONFIRM]] when name, phone, service, date AND time are all present in the collected data. When the user says yes / haan / ji / pakka / bilkul / theek hai to your summary, you MUST end that reply with [[CONFIRM]] immediately.
8. Pain/urgent cases: reassuring tone, advise WhatsApp/call 0312 3329479 right away; never diagnose or prescribe.
9. PRICES: only the ones listed; anything else -> final cost is confirmed at consultation.
10. Off-topic: politely steer back in one sentence. If asked something unknown, offer the team will call back via WhatsApp.`;
}

interface Draft {
  name: string;
  phone: string;
  service: string;
  type: string;
  date: string;
  time: string;
}
const FIELDS: Record<keyof Draft, boolean> = {
  name: true,
  phone: true,
  service: true,
  type: true,
  date: true,
  time: true,
};

function sanitizeDraft(raw: unknown): Draft {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 80) : "");
  const d: Draft = {
    name: str(o.name),
    phone: str(o.phone),
    service: str(o.service),
    type: o.type === "followup" ? "followup" : o.type === "new" ? "new" : "",
    date: str(o.date),
    time: str(o.time),
  };
  if (d.phone) {
    d.phone = normalizePhone(d.phone);
    if (!isValidPhone(d.phone)) d.phone = "";
  }
  if (d.date) {
    d.date = normalizeDateKey(d.date) ?? "";
  }
  if (d.time) {
    d.time = normalizeSlot(d.time) ?? "";
  }
  if (d.type && d.type !== "new" && d.type !== "followup") d.type = "";
  return d;
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function sanitizeMessages(raw: unknown): ChatMsg[] {
  if (!Array.isArray(raw)) return [];
  const msgs: ChatMsg[] = [];
  for (const m of raw as Array<{ role?: unknown; content?: unknown }>) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = typeof m?.content === "string" ? m.content.slice(0, 1200).trim() : "";
    if (role && content) msgs.push({ role, content });
    if (msgs.length >= 16) break;
  }
  return msgs.slice(-12);
}

const SET_RE = /\[\[\s*SET\s*(\{[\s\S]*?\})\s*\]\]/i;
const CONFIRM_RE = /\[\[\s*CONFIRM\s*\]\]/i;

/** Pull booking tokens out of the raw model text; return clean spoken reply. */
function extractActions(
  raw: string,
  draft: Draft,
): { reply: string; set: Partial<Draft>; confirm: boolean } {
  let text = raw;
  const set: Partial<Draft> = {};
  const m = text.match(SET_RE);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]) as Record<string, unknown>;
      if (typeof parsed.name === "string" && parsed.name.trim().length >= 2) {
        set.name = parsed.name.trim().slice(0, 80);
      }
      if (typeof parsed.phone === "string") {
        const p = normalizePhone(parsed.phone);
        if (isValidPhone(p)) set.phone = p;
      }
      if (typeof parsed.service === "string" && parsed.service.trim().length >= 2) {
        set.service = parsed.service.trim().slice(0, 80);
      }
      if (parsed.type === "new" || parsed.type === "followup") set.type = parsed.type;
      if (typeof parsed.date === "string") {
        const dk = normalizeDateKey(parsed.date);
        if (dk) set.date = dk;
      }
      if (typeof parsed.time === "string") {
        const tk = normalizeSlot(parsed.time);
        if (tk) set.time = tk;
      }
    } catch {
      /* malformed JSON -> ignore set */
    }
    text = text.replace(SET_RE, " ");
  }
  const confirm = CONFIRM_RE.test(text);
  text = text.replace(CONFIRM_RE, " ");
  text = text.replace(/\[\[|\]\]/g, " ").replace(/[*_#`<>]/g, "").replace(/\s+/g, " ").trim();
  return { reply: text, set, confirm };
}

function draftComplete(d: Draft): boolean {
  return Boolean(d.name && d.phone && d.service && d.type && d.date && d.time);
}

function platformConfigExists(): boolean {
  try {
    return [
      "./.z-ai-config",
      `${os.homedir()}/.z-ai-config`,
      "/etc/.z-ai-config",
    ].some((p) => existsSync(p));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* brain providers (streaming first, blocking fallback)                 */
/* ------------------------------------------------------------------ */

async function* streamPlatform(messages: ChatMsg[], system: string): AsyncGenerator<string> {
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();
  const stream = (await Promise.race([
    zai.chat.completions.create({
      messages: [{ role: "assistant", content: system } as never, ...messages] as never,
      thinking: { type: "disabled" },
      stream: true,
      max_tokens: 300,
    }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("platform open timeout")), 12000)),
  ])) as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;
  for await (const chunk of stream) {
    const d = chunk?.choices?.[0]?.delta?.content;
    if (d) yield d;
  }
}

async function blockPlatform(messages: ChatMsg[], system: string): Promise<string> {
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();
  const completion = (await Promise.race([
    zai.chat.completions.create({
      messages: [{ role: "assistant", content: system } as never, ...messages] as never,
      thinking: { type: "disabled" },
    }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("platform brain timeout")), 20000)),
  ])) as { choices?: Array<{ message?: { content?: string } }> };
  return completion?.choices?.[0]?.message?.content ?? "";
}

async function* streamPollinations(messages: ChatMsg[], system: string): AsyncGenerator<string> {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
      referrer: "tanveerkhokar.vercel.app",
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok || !res.body) throw new Error(`pollinations ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
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
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const d = json?.choices?.[0]?.delta?.content;
        if (d) yield d;
      } catch {
        /* partial json line -> ignore */
      }
    }
  }
}

async function blockPollinations(messages: ChatMsg[], system: string): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: system }, ...messages],
      referrer: "tanveerkhokar.vercel.app",
    }),
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data?.choices?.[0]?.message?.content ?? "";
}

/* ------------------------------------------------------------------ */
/* handler                                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }
  const b = body as { messages?: unknown; draft?: unknown };
  const messages = sanitizeMessages(b?.messages);
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
  }

  let draft = sanitizeDraft(b?.draft);

  // fresh availability for the prompt
  let appts: ApptRecord[] | null = null;
  const store = getStore();
  if (store) {
    try {
      appts = await store.list();
    } catch (err) {
      console.warn("[voice-agent/chat] availability read failed:", err instanceof Error ? err.message : err);
    }
  }

  const system = buildSystemPrompt(draft, appts);
  const encoder = new TextEncoder();
  const sse = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const push = (obj: unknown) => {
        if (!closed) controller.enqueue(sse(obj));
      };

      let raw = "";
      let sent = 0;
      // 1) streaming providers
      const streamers: Array<() => AsyncGenerator<string>> = platformConfigExists()
        ? [() => streamPlatform(messages, system), () => streamPollinations(messages, system)]
        : [() => streamPollinations(messages, system)];

      for (const make of streamers) {
        try {
          for await (const piece of make()) {
            raw += piece;
            // forward only the spoken portion (never leak protocol tokens)
            const safe = raw.replace(/\[\[[\s\S]*$/, "");
            if (safe.length > sent) {
              push({ type: "delta", t: safe.slice(sent) });
              sent = safe.length;
            }
          }
          break;
        } catch (err) {
          console.warn(
            "[voice-agent/chat] stream failed, trying next provider:",
            err instanceof Error ? err.message : err,
          );
          raw = "";
        }
      }

      // 2) blocking fallback when streaming produced nothing
      if (!raw.trim()) {
        const blockers: Array<() => Promise<string>> = platformConfigExists()
          ? [() => blockPlatform(messages, system), () => blockPollinations(messages, system)]
          : [() => blockPollinations(messages, system)];
        for (const run of blockers) {
          try {
            raw = await run();
            if (raw.trim()) {
              push({ type: "delta", t: raw.slice(sent) });
              sent = raw.length;
              break;
            }
          } catch (err) {
            console.warn(
              "[voice-agent/chat] brain failed:",
              err instanceof Error ? err.message : err,
            );
          }
        }
      }

      // 3) extract booking actions + finalise
      const { reply, set, confirm: modelConfirm } = extractActions(raw || "", draft);
      for (const k of Object.keys(FIELDS) as Array<keyof Draft>) {
        const v = set[k];
        if (v !== undefined && v !== "") draft[k] = v as string;
      }

      // safety net: a clear verbal confirmation with a complete draft books
      // even when the model forgets the [[CONFIRM]] token
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const verbalConfirm = /\b(haan|han|haan ji|ji haan|yes|yeah|pakka|paka|bilkul|theek|thik|confirm|kar do|kardo|book)\b|[ہں]\s*(ہاں|جی|پکا|بالکل|ٹھیک)|جی\s*ہاں|پکا\s*کر|بالکل/i.test(
        lastUser,
      );
      const confirm = modelConfirm || (verbalConfirm && draftComplete(draft));

      let booked: ApptRecord | null = null;
      let bookingError = "";
      if (confirm && draftComplete(draft) && store) {
        try {
          booked = await store.create({
            name: draft.name,
            phone: draft.phone,
            service: draft.service,
            type: draft.type,
            date: draft.date,
            timeSlot: draft.time,
            source: "voice-agent",
          });
          console.log(`[voice-agent/chat] booked ${draft.name} ${draft.date} ${draft.time}`);
        } catch (err) {
          bookingError = err instanceof Error ? err.message : "booking failed";
          console.warn("[voice-agent/chat] booking persist failed:", bookingError);
        }
      }

      push({
        type: "meta",
        reply,
        draft,
        booking: draftComplete(draft) || Boolean(booked),
        booked,
        bookingError,
      });
      push({ type: "done" });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      closed = true;
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
