/**
 * Compare female voice candidates speaking Urdu.
 * usage: bun scripts/test-urdu-females.ts
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { writeFileSync } from "fs";

const TEXT =
  "السلام علیکم! میں ثنا ہوں، ٹی کے ڈینٹ کی وائس اسسٹنٹ۔ ہمارے کلینک کے اوقات پیر سے ہفتہ، دس بجے صبح سے سات بجے شام تک ہیں۔";

const CANDIDATES = [
  { tag: "uzma", voice: "ur-PK-UzmaNeural" },
  { tag: "gul", voice: "ur-IN-GulNeural" },
  { tag: "ava", voice: "en-US-AvaMultilingualNeural" },
  { tag: "emma", voice: "en-US-EmmaMultilingualNeural" },
];

async function synth(voice: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: "+0%", pitch: "+0Hz" });
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

for (const c of CANDIDATES) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buf = await synth(c.voice, TEXT);
      const path = `/tmp/urdu-${c.tag}.mp3`;
      writeFileSync(path, buf);
      console.log(`${c.tag} (${c.voice}): ${buf.length} bytes -> ${path}`);
      break;
    } catch (e) {
      console.log(`${c.tag} attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, 600 * attempt));
      if (attempt === 3) console.log(`${c.tag}: FAILED`);
    }
  }
}
console.log("done");
