/**
 * TK Dent — Voice Agent TTS (fallback pipeline, Vercel-compatible)
 * POST /api/voice-agent/tts  { text, lang: "ur"|"en", emotion? }  -> audio/mpeg
 *
 * Engine chain (seamless — listener hears one continuous voice):
 *   1. ElevenLabs "Reva" (voice o85TqPN3F4P7dWae2paA, "Sana — Urdu
 *      Receptionist") — used when ELEVENLABS_API_KEYS / ELEVENLABS_API_KEY
 *      is present. Keys rotate round-robin; a key that is out of credits,
 *      unpaid or rate-limited is skipped automatically so the voice never
 *      audibly changes mid-conversation.
 *   2. msedge-tts  ur -> ur-IN-GulNeural (female Urdu)
 *                  en -> en-US-AvaMultilingualNeural (female multilingual)
 *   3. English-only platform TTS (z-ai SDK) as a last resort.
 * Client (VoiceAgent.tsx) further falls back to browser speechSynthesis.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* voice + prosody config                                               */
/* ------------------------------------------------------------------ */

const EL_VOICE_ID = "o85TqPN3F4P7dWae2paA"; // Reva — "Sana — Urdu Receptionist" (shared library voice)
const EL_MODEL = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5";

const VOICES: Record<string, string> = {
  ur: "ur-IN-GulNeural",
  en: "en-US-AvaMultilingualNeural",
};

const EMOTIONS: Record<string, { rate: string; pitch: string }> = {
  neutral: { rate: "+0%", pitch: "+0Hz" },
  warm: { rate: "+5%", pitch: "+14Hz" },
  reassuring: { rate: "-6%", pitch: "-8Hz" },
  excited: { rate: "+11%", pitch: "+22Hz" },
  sorry: { rate: "-10%", pitch: "-10Hz" },
};

const EMO_TAG = /\[(warm|reassuring|excited|neutral|sorry)\]/gi;

function cleanText(raw: string): string {
  return raw
    .replace(EMO_TAG, "")
    .replace(/\[\[\s*SET[\s\S]*?\]\]/gi, "")
    .replace(/\[\[\s*CONFIRM\s*\]\]/gi, "")
    .replace(/<<\s*BOOK\s*>>/gi, "")
    .replace(/[*_#`<>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

/** ElevenLabs keys: comma list preferred, numbered fallbacks supported. */
function elevenKeys(): string[] {
  const keys: string[] = [];
  const push = (v: string | undefined) => {
    if (!v) return;
    for (const k of v.split(",")) {
      const t = k.trim();
      if (t && !keys.includes(t)) keys.push(t);
    }
  };
  push(process.env.ELEVENLABS_API_KEYS);
  push(process.env.ELEVENLABS_API_KEY);
  push(process.env.ELEVENLABS_API_KEY_2);
  push(process.env.ELEVENLABS_API_KEY_3);
  push(process.env.ELEVENLABS_API_KEY_4);
  return keys;
}

/** Round-robin start index so credit usage stays even across accounts. */
let keyCursor = 0;

/* ------------------------------------------------------------------ */
/* msedge-tts synth with retries                                        */
/* ------------------------------------------------------------------ */

const RETRIES = 3;

async function synthOnce(text: string, lang: string, emotion: string): Promise<Buffer> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICES[lang] ?? VOICES.ur, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const e = EMOTIONS[emotion] ?? EMOTIONS.neutral;
  const { audioStream } = tts.toStream(text, { rate: e.rate, pitch: e.pitch });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buf = Buffer.concat(chunks);
  if (buf.length < 500) throw new Error(`suspicious audio size ${buf.length}`);
  return buf;
}

async function synthMsEdge(text: string, lang: string, emotion: string): Promise<Buffer> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return await synthOnce(text, lang, emotion);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("msedge-tts failed");
}

/* ------------------------------------------------------------------ */
/* ElevenLabs synth with key rotation                                   */
/* ------------------------------------------------------------------ */

/** Errors that mean "this key/plan can't serve right now" -> try next key. */
function isKeyFailure(status: number, detail: string): boolean {
  if (status === 401 || status === 402 || status === 403 || status === 429) return true;
  if (status === 409 && /voice_limit|concurrent/i.test(detail)) return true;
  if (status >= 500) return true;
  return /quota|credit|plan|unauthorized/i.test(detail);
}

async function synthElevenLabs(text: string): Promise<Buffer | null> {
  const keys = elevenKeys();
  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[(keyCursor + i) % keys.length];
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}?output_format=mp3_44100_128&optimize_streaming_latency=4`,
        {
          method: "POST",
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: EL_MODEL,
            voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 200);
        if (isKeyFailure(res.status, detail)) {
          console.warn(`[voice-agent/tts] elevenlabs key #${(keyCursor + i) % keys.length + 1} unusable (${res.status}) -> next`);
          continue;
        }
        throw new Error(`elevenlabs ${res.status}: ${detail}`);
      }
      const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
      if (buf.length < 500) throw new Error(`elevenlabs tiny audio ${buf.length}`);
      keyCursor = (keyCursor + i + 1) % keys.length; // next request uses the following key
      return buf;
    } catch (err) {
      console.warn(
        "[voice-agent/tts] elevenlabs attempt failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }
  return null; // all keys exhausted -> caller falls through to msedge
}

/* ------------------------------------------------------------------ */
/* platform TTS fallback (English only)                                 */
/* ------------------------------------------------------------------ */

async function synthPlatform(text: string): Promise<Buffer> {
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();
  const res = await zai.audio.tts.create({
    input: text.slice(0, 1000),
    voice: "tongtong",
    speed: 1.0,
    response_format: "mp3",
    stream: false,
  });
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(new Uint8Array(arrayBuffer));
  if (buf.length < 500) throw new Error(`platform audio too small ${buf.length}`);
  return buf;
}

/* ------------------------------------------------------------------ */
/* cache                                                                */
/* ------------------------------------------------------------------ */

const cache = new Map<string, Buffer>();
const CACHE_MAX = 80;

function cacheGet(key: string): Buffer | null {
  return cache.get(key) ?? null;
}

function cacheSet(key: string, buf: Buffer): void {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, buf);
}

/* ------------------------------------------------------------------ */
/* handler                                                              */
/* ------------------------------------------------------------------ */

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: { text?: unknown; lang?: unknown; emotion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers: NO_STORE });
  }

  const text = cleanText(String(body.text ?? ""));
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400, headers: NO_STORE });
  }

  const lang = body.lang === "en" ? "en" : "ur";
  const emotion = EMOTIONS[String(body.emotion)] ? String(body.emotion) : "neutral";
  const key = `${lang}|${emotion}|${text}`;

  const cached = cacheGet(key);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", ...NO_STORE },
    });
  }

  try {
    let audio: Buffer | null = null;
    let engine = "";

    // 1) ElevenLabs Reva (rotating keys) — only when keys are configured
    audio = await synthElevenLabs(text);
    if (audio) engine = "elevenlabs";

    // 2) msedge female neural voices
    if (!audio) {
      try {
        audio = await synthMsEdge(text, lang, emotion);
        engine = "msedge";
      } catch (err) {
        console.warn(
          `[voice-agent/tts] msedge failed (${lang}/${emotion}), trying platform fallback:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // 3) platform TTS — English only
    if (!audio && lang === "en") {
      audio = await synthPlatform(text);
      engine = "platform";
    }

    if (!audio) throw new Error("all tts engines failed");

    cacheSet(key, audio);
    console.log(
      `[voice-agent/tts] ${engine} ${lang}/${emotion} ${text.length}ch -> ${audio.length}b in ${Date.now() - started}ms`,
    );
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", ...NO_STORE },
    });
  } catch (err) {
    console.error(
      `[voice-agent/tts] failed in ${Date.now() - started}ms:`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "tts failed" }, { status: 500, headers: NO_STORE });
  }
}
