/**
 * ConvAI agent voice test v2 — clean event logging.
 * usage: bun scripts/convai-voice-test2.ts [--voice <id>] [--model <id>] [--tag <label>] [--question "..."]
 */
import { writeFileSync } from "fs";

const AGENT_ID = "agent_7801m7qwj5qke8jr2vfnd8svng6x";

const args = process.argv.slice(2);
const arg = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

const voiceOverride = arg("--voice");
const modelOverride = arg("--model");
const tag = arg("--tag") ?? "run";
const question = arg("--question") ?? "TK Dent کے اوقات کیا ہیں؟";
const MAX_MS = 60000;

const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);
const pcm: number[] = [];
let agentTexts = 0;
let sentQuestion = false;
let lastAudioAt = 0;
const t0 = Date.now();

function toWav(samples: Int16Array, rate: number): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

function medianPitch(samples: Int16Array, rate: number): number {
  const frame = Math.round(rate * 0.05), hop = Math.round(rate * 0.025);
  const minLag = Math.floor(rate / 400), maxLag = Math.floor(rate / 70);
  const pitches: number[] = [];
  for (let s = 0; s + frame < samples.length; s += hop) {
    let mean = 0;
    for (let i = 0; i < frame; i++) mean += samples[s + i];
    mean /= frame;
    const f: number[] = [];
    let energy = 0;
    for (let i = 0; i < frame; i++) { const v = samples[s + i] - mean; f.push(v); energy += v * v; }
    if (energy / frame < 250) continue;
    let bestLag = 0, bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < frame - lag; i++) corr += f[i] * f[i + lag];
      corr /= frame - lag;
      if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }
    if (bestLag > 0 && bestCorr > (energy / frame) * 0.35) pitches.push(rate / bestLag);
  }
  if (!pitches.length) return 0;
  pitches.sort((a, b) => a - b);
  return pitches[Math.floor(pitches.length / 2)];
}

function finish(reason: string): void {
  try { ws.close(); } catch {}
  const samples = new Int16Array(pcm);
  console.log(`\n===== RESULT [${tag}] =====`);
  console.log(`reason: ${reason} | elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`audio: ${(samples.length / 16000).toFixed(2)}s | agent text messages: ${agentTexts}`);
  if (samples.length > 16000) {
    writeFileSync(`/tmp/agent-${tag}.wav`, toWav(samples, 16000));
    const p = medianPitch(samples, 16000);
    console.log(`saved /tmp/agent-${tag}.wav | median pitch ${p.toFixed(1)}Hz -> ${p > 165 ? "FEMALE" : "MALE"}`);
  } else {
    console.log("no usable audio");
  }
  process.exit(0);
}

ws.onopen = () => {
  console.log("connected");
  const override: Record<string, unknown> = {};
  if (voiceOverride || modelOverride) {
    const tts: Record<string, unknown> = {};
    if (voiceOverride) tts.voice_id = voiceOverride;
    if (modelOverride) tts.model_id = modelOverride;
    override.tts = tts;
    console.log(`override -> voice=${voiceOverride ?? "-"} model=${modelOverride ?? "-"}`);
  }
  if (args.includes("--tsonly")) {
    override.conversation = { text_only: true };
    console.log("override -> text_only=true");
  }
  ws.send(JSON.stringify({ type: "conversation_initiation_client_data", ...(Object.keys(override).length ? { conversation_config_override: override } : {}) }));
};

ws.onmessage = (ev) => {
  let msg: Record<string, unknown>;
  try { msg = JSON.parse(String(ev.data)) as Record<string, unknown>; } catch { return; }
  const type = msg.type as string;

  switch (type) {
    case "conversation_initiation_metadata":
      console.log(">> metadata");
      break;
    case "audio": {
      lastAudioAt = Date.now();
      const a = (msg.audio_event as { audio_base_64?: string } | undefined)?.audio_base_64;
      if (a) {
        const c = Buffer.from(a, "base64");
        for (let i = 0; i + 1 < c.length; i += 2) pcm.push(c.readInt16LE(i));
      }
      break;
    }
    case "agent_response": {
      const r = (msg.agent_response_event as { agent_response?: string } | undefined)?.agent_response;
      agentTexts++;
      console.log(`>> agent says: ${(r ?? "").slice(0, 140)}`);
      if (!sentQuestion && agentTexts >= 1) {
        console.log(">> greeting received, waiting for audio to finish before asking...");
      }
      break;
    }
    case "ping": {
      const pid = (msg.ping_event as { ping_id?: number } | undefined)?.ping_id;
      if (pid != null) ws.send(JSON.stringify({ type: "pong", pong_event: { event_id: pid } }));
      break;
    }
    case "interruption":
    case "vad_score":
    case "user_transcription":
    case "agent_response_correction":
    case "client_tool_call":
      break;
    default:
      console.log(`>> [${type}]`, JSON.stringify(msg).slice(0, 400));
  }
};

setInterval(() => {
  const el = Date.now() - t0;
  // once greeting audio has been quiet for 4s, send the question
  if (!sentQuestion && agentTexts >= 1 && pcm.length && Date.now() - lastAudioAt > 4000) {
    sentQuestion = true;
    console.log(">> audio quiet 4s, sending question:", question);
    ws.send(JSON.stringify({ type: "user_message", text: question }));
  }
  if (sentQuestion && agentTexts >= 2 && pcm.length && Date.now() - lastAudioAt > 5000) finish("answered + audio done");
  else if (el > MAX_MS) finish("timeout");
}, 1000);

ws.onerror = () => console.log("!! ws error");
ws.onclose = (ev) => { if (Date.now() - t0 < 5000) finish(`closed early ${ev.code} ${ev.reason}`); };
