/**
 * Test: does a text_only ConvAI session still accept user AUDIO input (ASR)?
 * Sends a pre-synthesized Urdu question (pcm 16k) as chunks; expects a text reply.
 * usage: bun scripts/convai-asr-test.ts
 */
import { readFileSync } from "fs";

const AGENT_ID = "agent_7801m7qwj5qke8jr2vfnd8svng6x";

async function main(): Promise<void> {
  console.log("loading question pcm...");
  const pcm16k = readFileSync("/tmp/question.pcm");
  console.log(`pcm: ${pcm16k.length} bytes (${(pcm16k.length / 32000).toFixed(1)}s)`);

  const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);
  const t0 = Date.now();
  let sent = false;
  let audioOut = 0;
  let textOut: string[] = [];

  ws.onopen = () => {
    console.log("connected (text_only session)");
    ws.send(
      JSON.stringify({
        type: "conversation_initiation_client_data",
        conversation_config_override: { conversation: { text_only: true } },
      }),
    );
  };

  const CHUNK = 6400; // 200ms @16k 16-bit mono
  const sendAudio = (): void => {
    for (let off = 0; off < pcm16k.length; off += CHUNK) {
      const slice = pcm16k.subarray(off, Math.min(off + CHUNK, pcm16k.length));
      ws.send(
        JSON.stringify({ type: "user_audio_chunk", user_audio_chunk: slice.toString("base64") }),
      );
    }
    console.log("audio sent");
  };

  ws.onmessage = (ev) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = msg.type as string;
    if (type === "conversation_initiation_metadata" && !sent) {
      sent = true;
      setTimeout(sendAudio, 300);
    } else if (type === "user_transcription") {
      const ut = msg.user_transcription_event as { user_transcript?: string } | undefined;
      console.log(">> user transcript:", ut?.user_transcript);
    } else if (type === "agent_response") {
      const r = (msg.agent_response_event as { agent_response?: string } | undefined)
        ?.agent_response;
      if (r) textOut.push(r);
      console.log(">> agent says:", (r ?? "").slice(0, 160));
    } else if (type === "audio") {
      audioOut++;
    } else if (type === "ping") {
      const pid = (msg.ping_event as { ping_id?: number } | undefined)?.ping_id;
      if (pid != null) ws.send(JSON.stringify({ type: "pong", pong_event: { event_id: pid } }));
    } else if (type === "interruption" || type === "vad_score") {
      // ignore
    } else {
      console.log(`>> [${type}]`, JSON.stringify(msg).slice(0, 240));
    }
  };

  setTimeout(() => {
    console.log(`\n===== RESULT =====`);
    console.log(`text replies: ${textOut.length}, audio events: ${audioOut}`);
    console.log(`ASR works in text_only mode: ${textOut.length > 0 ? "YES" : "NO (unverified)"}`);
    ws.close();
    process.exit(0);
  }, 40000);

  console.log("elapsed guard started");
  void t0;
}

void main();
