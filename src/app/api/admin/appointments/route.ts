/**
 * TK Dent — doctors dashboard API (admin).
 * GET   /api/admin/appointments  (header x-admin-pin) -> list + stats
 * PATCH /api/admin/appointments  (header x-admin-pin, body {id, status})
 */

import { NextRequest, NextResponse } from "next/server";
import { APPT_STATUSES, clinicDateKey, shiftDateKey } from "@/lib/clinic";
import { getStore, isPersistentStore } from "@/lib/appointments-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function pinOk(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PIN ?? "tkdent";
  return (req.headers.get("x-admin-pin") ?? "") === expected;
}

export async function GET(req: NextRequest) {
  if (!pinOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const store = getStore();
  if (!store) {
    return NextResponse.json(
      { ok: false, error: "store unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }

  let appointments;
  try {
    appointments = await store.list();
  } catch (err) {
    console.error("[admin/appointments] list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "store error" }, { status: 503, headers: NO_STORE });
  }

  const today = clinicDateKey();
  const weekEnd = shiftDateKey(today, 7);
  const active = appointments.filter((a) => a.status !== "cancelled");
  const stats = {
    today: active.filter((a) => a.date === today).length,
    week: active.filter((a) => a.date >= today && a.date <= weekEnd).length,
    pending: active.filter((a) => a.status === "pending").length,
    newPatients: active.filter((a) => a.type === "new").length,
    followups: active.filter((a) => a.type === "followup").length,
  };

  return NextResponse.json(
    { ok: true, pinDefault: !process.env.ADMIN_PIN, persistent: isPersistentStore(), appointments, stats },
    { headers: NO_STORE },
  );
}

export async function PATCH(req: NextRequest) {
  if (!pinOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400, headers: NO_STORE });
  }

  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400, headers: NO_STORE });
  }
  if (!(APPT_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400, headers: NO_STORE });
  }

  const store = getStore();
  if (!store) {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 503, headers: NO_STORE });
  }

  try {
    const appointment = await store.updateStatus(id, status);
    if (!appointment) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true, appointment }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/appointments] patch failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 503, headers: NO_STORE });
  }
}
