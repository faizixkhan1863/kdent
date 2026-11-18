/**
 * TK Dent — appointment intake from the voice agent (Sana).
 * POST /api/voice-agent/book
 *   { name, phone, service, type, date, timeSlot, notes?, source? }
 * -> { ok, appointment }  |  { ok:false, error, reason? }
 *
 * The booking is persisted through the appointment store (Prisma locally,
 * private GitHub repo on Vercel) so it appears in the doctors dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  normalizePhone,
  isValidPhone,
  normalizeDateKey,
  normalizeSlot,
  freeSlotsFor,
  bookedSlotsFor,
  isClosedDay,
  clinicDateKey,
} from "@/lib/clinic";
import { getStore } from "@/lib/appointments-store";

export const runtime = "nodejs";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid json");
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(body.phone ?? ""));
  const service = String(body.service ?? "").trim().slice(0, 80);
  const type = body.type === "followup" ? "followup" : "new";
  const date = normalizeDateKey(String(body.date ?? ""));
  const timeSlot = normalizeSlot(String(body.timeSlot ?? body.time ?? ""));
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;
  const source = String(body.source ?? "voice-agent").slice(0, 20);

  if (name.length < 2) return bad("name required");
  if (!isValidPhone(phone)) return bad("valid phone required");
  if (service.length < 2) return bad("service required");
  if (!date) return bad("valid date required");
  if (!timeSlot) return bad("valid timeSlot required");

  const store = getStore();
  if (!store) return bad("store unavailable", 503);

  try {
    const appts = await store.list();

    if (isClosedDay(date)) {
      return NextResponse.json(
        { ok: false, error: "closed", reason: "Sunday closed — Monday se aage slots free hain" },
        { status: 409, headers: NO_STORE },
      );
    }
    if (date === clinicDateKey() && bookedSlotsFor(appts, date).has(timeSlot)) {
      return NextResponse.json(
        { ok: false, error: "slot_taken", reason: "ye slot abhi book ho chuka hai" },
        { status: 409, headers: NO_STORE },
      );
    }
    if (!freeSlotsFor(appts, date).includes(timeSlot)) {
      const free = freeSlotsFor(appts, date);
      return NextResponse.json(
        { ok: false, error: "slot_taken", free: free.slice(0, 10) },
        { status: 409, headers: NO_STORE },
      );
    }

    const appointment = await store.create({
      name,
      phone,
      service,
      type,
      date,
      timeSlot,
      notes,
      source,
    });

    console.log(`[voice-agent/book] ${source} ${name} ${date} ${timeSlot} ${service}`);
    return NextResponse.json({ ok: true, appointment }, { headers: NO_STORE });
  } catch (err) {
    console.error("[voice-agent/book] failed:", err instanceof Error ? err.message : err);
    return bad("booking failed — WhatsApp par book karein", 503);
  }
}
