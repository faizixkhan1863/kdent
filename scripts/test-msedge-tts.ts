/**
 * Test msedge-tts (pure JS, Vercel-compatible) for Urdu + English voices.
 * Mirrors exactly what /api/voice-agent/tts will do.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const EMOTIONS: Record<string, { rate: string; pitch: string }> = {
  neutral: { rate: "+0%", pitch: "+0Hz" },
  warm: { rate: "+5%", pitch: "+14Hz" },
  reassuring: { rate: "-6%", pitch: "-8Hz" },
  excited: { rate: "+11%", pitch: "+22Hz" },
  sorry: { rate: "-10%", pitch: "-10Hz" },
};

async function synth(
  voice: string,
  text: string,
  emotion: string,
  out: string,
): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const e = EMOTIONS[emotion] ?? EMOTIONS.neutral;
  const { audioStream } = tts.toStream(text, {
    rate: e.rate,
    pitch: e.pitch,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buf = Buffer.concat(chunks);
  await Bun.write(out, buf);
  console.log(`${voice} [${emotion}] -> ${out} (${buf.length} bytes)`);
}

const urdu = "السلام علیکم! میں ثنا ہوں، ٹی کے ڈینٹ کی وائس اسسٹنٹ۔ آپ اپوائنٹمنٹ کے لیے واٹس ایپ کر سکتے ہیں۔";
const eng = "Assalam o Alaikum! I am Sana, the TK Dent voice assistant. How may I help you today?";

await synth("ur-PK-UzmaNeural", urdu, "warm", "/tmp/edge-ur.mp3");
await synth("en-US-AndrewMultilingualNeural", eng, "neutral", "/tmp/edge-en.mp3");
console.log("DONE");
