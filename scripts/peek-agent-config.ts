/**
 * Peek the public ElevenLabs ConvAI agent config via websocket.
 * Connects, captures conversation_initiation_metadata, disconnects.
 */
const AGENT_ID = "agent_7801m7qwj5qke8jr2vfnd8svng6x";

const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`,
);

const timer = setTimeout(() => {
  console.log("TIMEOUT - no metadata received");
  ws.close();
  process.exit(1);
}, 15000);

ws.onopen = () => console.log("connected");
ws.onmessage = (ev) => {
  try {
    const data = JSON.parse(String(ev.data));
    if (data.type === "conversation_initiation_metadata") {
      clearTimeout(timer);
      console.log(JSON.stringify(data, null, 2));
      ws.close();
      process.exit(0);
    } else if (data.type === "interruption" || data.type === "ping") {
      // ignore
    } else {
      console.log("other message type:", data.type);
    }
  } catch (e) {
    console.log("parse error", e);
  }
};
ws.onerror = (e) => {
  clearTimeout(timer);
  console.log("ws error");
  process.exit(1);
};
ws.onclose = (ev) => {
  clearTimeout(timer);
  console.log("closed:", ev.code, ev.reason);
};
