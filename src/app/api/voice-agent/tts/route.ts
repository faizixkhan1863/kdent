/**
 * TK Dent — Voice Agent TTS (Vercel-compatible serverless route)
 * POST /api/voice-agent/tts  { text, lang: "ur"|"en", emotion? }  -> audio/mpeg
 *
 * Primary engine: msedge-tts (pure JS WebSocket -> Microsoft neural voices).
 *   ur -> ur-PK-UzmaNeural   (native female Urdu voice)
 *   en -> en-US-AndrewMultilingualNeural
 * English fallback: platform TTS (z-ai SDK) if the primary engine fails.
 * Client (VoiceAgent.tsx) further falls back to browser speechSynthesis.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* voice + prosody config                                               */
/* ------------------------------------------------------------------ */

const VOICES: Record<string, string> = {
  ur: "ur-PK-UzmaNeural",
  en: "en-US-AndrewMultilingualNeural",
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
    .replace(/<<\s*BOOK\s*>>/gi, "")
    .replace(/[*_#`<>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

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
    return new Response(cached, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", ...NO_STORE },
    });
  }

  try {
    let audio: Buffer;
    try {
      audio = await synthMsEdge(text, lang, emotion);
    } catch (err) {
      console.warn(
        `[voice-agent/tts] msedge failed (${lang}/${emotion}), trying platform fallback:`,
        err instanceof Error ? err.message : err,
      );
      if (lang !== "en") throw err; // Urdu: no platform alternative -> client fallback
      audio = await synthPlatform(text);
    }

    cacheSet(key, audio);
    console.log(
      `[voice-agent/tts] ${lang}/${emotion} ${text.length}ch -> ${audio.length}b in ${Date.now() - started}ms`,
    );
    return new Response(audio, {
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
