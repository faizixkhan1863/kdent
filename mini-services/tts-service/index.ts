/**
 * TK Dent — TTS micro-service (port 3030)
 * Neural text-to-speech via edge-tts (Microsoft Edge voices, free).
 * Urdu  -> ur-PK-AsadNeural
 * Eng   -> en-US-AndrewMultilingualNeural
 * Emotion presets drive rate/pitch prosody.
 *
 * POST /tts   { text, lang: "ur"|"en", emotion?: string }  -> audio/mpeg
 * GET  /health -> { ok: true }
 */

const PORT = 3030;

const VOICES: Record<string, string> = {
  ur: "ur-PK-AsadNeural",
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
    .replace(/[*_#`>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

/** Simple in-memory cache so greetings / repeated lines stay instant. */
const cache = new Map<string, Buffer>();
const CACHE_MAX = 80;

async function synthOnce(text: string, lang: string, emotion: string): Promise<Buffer> {
  const e = EMOTIONS[emotion] ?? EMOTIONS.neutral;
  const voice = VOICES[lang] ?? VOICES.ur;
  const out = `/tmp/tts-${crypto.randomUUID()}.mp3`;

  const proc = Bun.spawn(
    [
      "python3",
      "-m",
      "edge_tts",
      `--voice=${voice}`,
      `--rate=${e.rate}`,
      `--pitch=${e.pitch}`,
      `--text=${text}`,
      `--write-media=${out}`,
    ],
    { stdout: "ignore", stderr: "pipe" },
  );

  const timer = setTimeout(() => proc.kill(), 25000);
  const code = await proc.exited;
  clearTimeout(timer);

  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`edge-tts exited ${code}: ${err.slice(0, 300)}`);
  }

  const buf = Buffer.from(await Bun.file(out).arrayBuffer());
  try {
    const rm = Bun.spawn(["rm", "-f", out]);
    await rm.exited;
  } catch {}

  if (buf.length < 500) throw new Error(`suspicious audio size ${buf.length}`);
  return buf;
}

async function synth(text: string, lang: string, emotion: string): Promise<Buffer> {
  const key = `${lang}|${emotion}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const buf = await synthOnce(text, lang, emotion);
      if (cache.size >= CACHE_MAX) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
      cache.set(key, buf);
      return buf;
    } catch (err) {
      lastErr = err;
      console.warn(`[tts] attempt ${attempt}/3 failed:`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("synth failed");
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
  port: PORT,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, voices: VOICES }, { headers: CORS });
    }

    if (req.method === "POST" && url.pathname === "/tts") {
      const started = Date.now();
      try {
        const body = (await req.json()) as {
          text?: string;
          lang?: string;
          emotion?: string;
        };
        const text = cleanText(String(body.text ?? ""));
        if (!text) {
          return Response.json({ error: "text required" }, { status: 400, headers: CORS });
        }
        const lang = body.lang === "en" ? "en" : "ur";
        const emotion = EMOTIONS[String(body.emotion)] ? String(body.emotion) : "neutral";

        const audio = await synth(text, lang, emotion);
        console.log(`[tts] ${lang}/${emotion} ${text.length}ch -> ${audio.length}b in ${Date.now() - started}ms`);
        return new Response(audio, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", ...CORS },
        });
      } catch (err) {
        console.error(`[tts] failed in ${Date.now() - started}ms:`, err instanceof Error ? err.message : err);
        return Response.json({ error: "tts failed" }, { status: 500, headers: CORS });
      }
    }

    return Response.json({ error: "not found" }, { status: 404, headers: CORS });
  },
});

console.log(`[tts-service] listening on :${PORT} | ur=${VOICES.ur} en=${VOICES.en}`);
