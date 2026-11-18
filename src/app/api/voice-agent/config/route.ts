/**
 * TK Dent — voice agent runtime config (client-safe).
 * GET /api/voice-agent/config -> { agentIds: [...] }
 * EL_AGENT_IDS env (comma separated) enables multi-account failover;
 * when the primary agent's account runs out of conversational credits,
 * the client transparently moves to the next agent — same voice, same
 * behaviour, no audible difference.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_AGENTS = ["agent_7801m7qwj5qke8jr2vfnd8svng6x"];

export async function GET() {
  const ids = (process.env.EL_AGENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return NextResponse.json(
    { agentIds: ids.length > 0 ? ids : DEFAULT_AGENTS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
