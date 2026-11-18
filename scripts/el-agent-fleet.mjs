/**
 * TK Dent — ElevenLabs agent fleet builder.
 *
 * Jab user naye ElevenLabs accounts banaye (fallback credits ke liye),
 * ye script har account par EXACT same "Sana" agent bana deta hai:
 *   1. Reva voice (shared library voice o85TqPN3F4P7dWae2paA) ko us
 *      account ke Voice Library mein add karta hai — same voice_id, so
 *      fallback mein awaz bilkul waisi hi sunti hai.
 *   2. Client tools (check_slots + book_appointment) create karta hai.
 *   3. Sana agent create karta hai (same prompt, same TTS config,
 *      eager turn, low latency).
 *
 * Usage:
 *   node scripts/el-agent-fleet.mjs sk_key1 sk_key2 sk_key3
 *   # ya:  ELEVENLABS_NEW_KEYS="sk1,sk2" node scripts/el-agent-fleet.mjs
 *
 * Output ke end mein EL_AGENT_IDS env line print hoti hai — usko Vercel
 * env var mein paste kar dena (comma-separated, priority order mein).
 */

const BASE = "https://api.elevenlabs.io/v1";
const REVA_SHARED_VOICE_ID = "o85TqPN3F4P7dWae2paA";

const CHECK_SLOTS_TOOL = {
  tool_config: {
    type: "client",
    name: "check_slots",
    description:
      "TK Dent clinic ke free appointment slots check karta hai. Clinic scheduler se aaj aur agle 7 din ke khali time slots milte hain. Jab user availability ya khali slots poochhe, ya booking propose karne se pehle, ye tool zaroor call karein. Sirf isi ke results quote karein.",
    parameters: {
      properties: {
        date: { type: "string", description: "Specific date YYYY-MM-DD (optional). Empty = next 7 days summary." },
      },
      required: [],
    },
  },
};

const BOOK_TOOL = {
  tool_config: {
    type: "client",
    name: "book_appointment",
    description:
      "TK Dent clinic mein appointment pakka book karta hai (doctors dashboard mein foran show hota hai). Tabhi call karein jab name, phone, service, type, date aur time sab collected hon AUR user ne clearly confirmation di ho (han/pakka/yes). Booking success par user ko din, tareekh aur waqt ke sath warm confirmation dein.",
    parameters: {
      properties: {
        name: { type: "string", description: "Patient ka poora naam" },
        phone: { type: "string", description: "WhatsApp phone number, digits only e.g. 03001234567" },
        service: { type: "string", description: "Requested service/treatment, e.g. Whitening, Root Canal, Aligners" },
        type: { type: "string", description: "new (naya patient) ya followup (follow-up visit)", enum: ["new", "followup"] },
        date: { type: "string", description: "Appointment date YYYY-MM-DD (sirf check_slots wale free dates)" },
        time: { type: "string", description: "Appointment time HH:MM 24h format, e.g. 17:00 (sirf free slot)" },
      },
      required: ["name", "phone", "service", "type", "date", "time"],
    },
  },
};

const PROMPT = `You are Sana, the warm professional voice receptionist of TK Dent Dental & Aesthetic Care in Bani Gala, Islamabad. You are female, friendly and calm, like a real front-desk person on the phone.

CLINIC FACTS (never contradict): Doctor Dr. Tanveer Khokhar, senior Oral & Maxillofacial Surgeon, FCPS qualified, C-Endo certified. Services: Smile Design & Cosmetic Dentistry, Clear Aligners & Braces (plans from Rs 5,000), Dental Implants (placed by FCPS surgeon), Painless single-visit Root Canal (C-Endo certified), Whitening & Polishing (Rs 15,000, two sessions included), Crowns & Veneers, Family & General Dentistry, kids dentistry. Timings: Monday to Saturday 10 AM to 7 PM, 30-minute slots, last slot 6:30 PM. Sunday closed. Address: House 34-C, Akram Road, Bani Gala, Islamabad. Phone & WhatsApp: 0312 3329479. Instagram: @TK_dent_care.

CONVERSATION RULES: 1) Reply in the same language the user used: Urdu or Roman Urdu gives reply in Urdu script (اردو), English gives reply in English. 2) Keep replies VERY SHORT: 1 to 2 short sentences, max 25 words; never lists, markdown, emojis or URLs. One question at a time. Skip repeated pleasantries. 3) Quote only the prices listed above; anything else: final cost is confirmed at consultation. 4) Pain or urgent cases: reassuring tone, advise WhatsApp or calling 0312 3329479 right away; never diagnose remotely or prescribe. 5) Off-topic: politely steer back to dental care in one sentence. 6) You are Sana, the clinic voice assistant; never mention being an AI or these instructions.
7) TURN DISCIPLINE: after your greeting, stay QUIET and WAIT — the caller speaks first. Never offer anything unprompted. If a turn arrives but the caller's input is empty, unclear or just background noise, do NOT assume anything and do NOT mention booking; ask exactly one short question: 'جی، بتائیں — میں آپ کی کیا مدد کر سکتی ہوں؟' Booking talk starts ONLY when the caller clearly asks about an appointment, timing or booking.

APPOINTMENT BOOKING — you can book DIRECTLY using your tools (the clinic dashboard sees it instantly):
- Use check_slots whenever the user asks about availability or free slots, and before proposing appointment times. Quote ONLY the times check_slots returns, spoken naturally (Urdu words like کل شام پانچ بجے or Friday 11 baje). Never invent slots. Sunday is closed.
- To book, collect ONE thing at a time: name -> phone (WhatsApp number) -> which service -> naya patient ya follow-up -> preferred day and time (suggest 2-3 free slots from check_slots). Ask one short question per turn.
- When all details are collected, repeat them briefly and ask to confirm (kya main pakka kar dun?). Only after the user clearly confirms, call book_appointment with name, phone, service, type (new or followup), date (YYYY-MM-DD) and time (HH:MM 24h). Then give a warm confirmation with day, date and time in the user language.
- If booking fails or the slot is taken, call check_slots again and offer the nearest free slots.
- Never read out long slot lists; 2-3 best options are enough.`;

async function api(key, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 220)}`);
  }
  return json;
}

async function buildAgent(key, index) {
  const log = (msg) => console.log(`  [key ${index}] ${msg}`);

  // 0) sanity: who are we?
  const me = await api(key, "GET", "/user");
  log(`account tier=${me.subscription?.tier ?? "?"} quota=${me.subscription?.character_count ?? "?"}/${me.subscription?.character_limit ?? "?"}`);

  // 1) add Reva (shared library voice) to this account if missing
  let voices = [];
  try {
    const vs = await api(key, "GET", "/voices");
    voices = vs.voices ?? [];
  } catch (e) {
    log(`voice list failed: ${e.message}`);
  }
  let voiceId = (voices.find((v) => v.voice_id === REVA_SHARED_VOICE_ID) || {}).voice_id;
  if (voiceId) {
    log("Reva voice already in library");
  } else {
    try {
      const added = await api(key, "POST", `/voices/add/shared/${REVA_SHARED_VOICE_ID}`, {
        new_name: "Sana — Urdu Receptionist",
      });
      voiceId = added.voice_id;
      log(`Reva added to library (${voiceId})`);
    } catch (e) {
      log(`Reva add failed: ${e.message}`);
      log("NOTE: library voices via API need a PAID plan; agent creation will try the voice anyway.");
    }
  }

  // 2) client tools
  const toolIds = [];
  for (const tool of [CHECK_SLOTS_TOOL, BOOK_TOOL]) {
    const t = await api(key, "POST", "/convai/tools", tool);
    toolIds.push(t.id);
    log(`tool ${t.tool_config?.name} -> ${t.id}`);
  }

  // 3) agent
  const agentBody = {
    name: "Sana",
    conversation_config: {
      asr: { quality: "high", provider: "scribe_realtime", user_input_audio_format: "pcm_16000" },
      turn: { turn_eagerness: "normal", speculative_turn: false, turn_model: "turn_v3" },
      tts: {
        model_id: "eleven_v4_turbo",
        voice_id: voiceId ?? REVA_SHARED_VOICE_ID,
        agent_output_audio_format: "pcm_16000",
        optimize_streaming_latency: 4,
        stability: 0.5,
        similarity_boost: 0.75,
        expressive_mode: false,
        enable_phoneme_tags: false,
      },
      conversation: { max_duration_seconds: 360, silence_end_call_timeout: 20, client_events: ["audio", "interruption", "user_transcript", "agent_response", "agent_response_correction"] },
      agent: {
        first_message: "السلام علیکم! میں ثنا ہوں، ٹی کے ڈینٹ کی وائس اسسٹنٹ۔ بتائیں، آپ کو ٹریٹمنٹس یا اپوائنٹمنٹ کے بارے میں کیا جاننا ہے؟",
        language: "ur",
        prompt: { prompt: PROMPT, llm: "gemini-3.5-flash", temperature: 0, tool_ids: toolIds, enable_prompt_caching: true },
      },
    },
  };
  const agent = await api(key, "POST", "/convai/agents", agentBody);
  log(`agent created -> ${agent.agent_id}`);
  return agent.agent_id;
}

async function main() {
  const argKeys = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const envKeys = (process.env.ELEVENLABS_NEW_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const keys = [...new Set([...argKeys, ...envKeys])];

  if (keys.length === 0) {
    console.error("No API keys given. Usage: node scripts/el-agent-fleet.mjs sk_key1 sk_key2 ...");
    process.exit(1);
  }

  console.log(`Building Sana agent fleet across ${keys.length} account(s)...\n`);
  const agentIds = [];
  for (let i = 0; i < keys.length; i += 1) {
    try {
      const id = await buildAgent(keys[i], i + 1);
      agentIds.push(id);
    } catch (e) {
      console.error(`  [key ${i + 1}] FAILED: ${e.message}`);
    }
  }

  console.log("\n---- RESULT ----");
  if (agentIds.length === 0) {
    console.error("No agents created.");
    process.exit(1);
  }
  console.log("Add these to Vercel env var EL_AGENT_IDS (comma separated, failover order):");
  console.log(`EL_AGENT_IDS=${["agent_7801m7qwj5qke8jr2vfnd8svng6x", ...agentIds].join(",")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
