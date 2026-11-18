import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizePhone,
  isValidPhone,
  normalizeDateKey,
  normalizeSlot,
  freeSlotsFor,
} from "@/lib/clinic";
import { getStore } from "@/lib/appointments-store";

const bookingSchema = z.object({
  name: z.string().min(2, "Please enter your full name").max(80),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone can only contain digits, +, - and spaces"),
  service: z.string().min(2).max(80),
  date: z.string().min(4).max(20),
  timeSlot: z.string().min(2).max(40),
  notes: z.string().max(500).optional().nullable(),
  type: z.enum(["new", "followup"]).optional(),
  slotFlexible: z.boolean().optional(),
});

/**
 * Website form booking intake.
 *
 * - Persists through the appointment store (Prisma locally, private
 *   GitHub data repo on Vercel) so it appears in the doctors dashboard.
 * - Returns a WhatsApp deep-link so the clinic instantly sees the
 *   request even while the dashboard is not open.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid data";
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const { name, service, notes, type, slotFlexible } = parsed.data;
    const phone = normalizePhone(parsed.data.phone);
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }
    const date = normalizeDateKey(parsed.data.date);
    const timeSlot = normalizeSlot(parsed.data.timeSlot);

    // 1) Persist (best-effort — WhatsApp remains the guaranteed channel).
    let bookingId = `KD${Date.now().toString(36).toUpperCase()}`;
    let persisted = false;

    const store = getStore();
    if (store && date && timeSlot) {
      try {
        const appts = await store.list();
        const free = freeSlotsFor(appts, date);
        // Flexible patients: bump to the nearest free slot when theirs is taken.
        const finalSlot =
          free.includes(timeSlot) || slotFlexible
            ? (free.includes(timeSlot) ? timeSlot : (free[0] ?? timeSlot))
            : timeSlot;
        const booking = await store.create({
          name: name.trim(),
          phone,
          service,
          type: type ?? "new",
          date,
          timeSlot: finalSlot,
          notes: notes?.trim() || null,
          source: "web",
        });
        bookingId = booking.id;
        persisted = true;
      } catch (dbError) {
        console.error(
          "[BOOKINGS_POST] store unavailable — continuing via WhatsApp:",
          dbError
        );
      }
    }

    // 2) WhatsApp deep-link so the clinic receives the request instantly.
    const waMessage = encodeURIComponent(
      `Assalamualaikum! I would like to book an appointment at TK Dent.\n\n` +
        `Name: ${name}\n` +
        `Service: ${service}\n` +
        `Preferred Date: ${date ?? parsed.data.date}\n` +
        `Preferred Time: ${timeSlot ?? parsed.data.timeSlot}\n` +
        (type === "followup" ? `Visit type: Follow-up\n` : "") +
        (notes ? `Notes: ${notes}\n` : "") +
        `\n(Booking ref: ${bookingId.slice(-6).toUpperCase()})`
    );
    const whatsappUrl = `https://wa.me/923123329479?text=${waMessage}`;

    return NextResponse.json({
      success: true,
      bookingId,
      whatsappUrl,
      persisted,
    });
  } catch (error) {
    console.error("[BOOKINGS_POST]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong. Please call us directly at 0312 3329479.",
      },
      { status: 500 }
    );
  }
}
