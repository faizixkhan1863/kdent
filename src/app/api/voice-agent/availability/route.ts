/**
 * TK Dent — slot availability.
 * GET /api/voice-agent/availability           -> next 7 days
 * GET /api/voice-agent/availability?days=14   -> next N days
 * GET /api/voice-agent/availability?date=YYYY-MM-DD -> single day board
 * Used by the doctors dashboard slot board and the voice agent's
 * check_slots client tool.
 */

import { NextRequest, NextResponse } from "next/server";
import { availabilityBoard, clinicDateKey, type ApptRecord } from "@/lib/clinic";
import { getStore } from "@/lib/appointments-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const daysRaw = Number(sp.get("days") ?? 7);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 30) : 7;

  const store = getStore();
  if (!store) {
    return NextResponse.json(
      { ok: false, error: "store unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }

  let appointments: ApptRecord[] = [];
  try {
    appointments = await store.list();
  } catch (err) {
    console.error("[availability] store list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "store error" }, { status: 503, headers: NO_STORE });
  }

  const fromKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const board = availabilityBoard(appointments, fromKey ? 1 : days, fromKey);
  const boardDate = fromKey ?? clinicDateKey();
  const single = board.find((d) => d.date === boardDate) ?? board[0];

  return NextResponse.json(
    { ok: true, date: single.date, closed: single.closed, slots: single.slots },
    { headers: NO_STORE },
  );
}
