import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bookingSchema = z.object({
  name: z.string().min(2, "Please enter your full name").max(80),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone can only contain digits, +, - and spaces"),
  service: z.string().min(2).max(80),
  date: z.string().min(4).max(20),
  timeSlot: z.string().min(2).max(30),
  notes: z.string().max(500).optional().nullable(),
});

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

    const { name, phone, service, date, timeSlot, notes } = parsed.data;

    const booking = await db.booking.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        service,
        date,
        timeSlot,
        notes: notes?.trim() || null,
      },
    });

    // Build a WhatsApp deep-link so the clinic receives the request instantly
    const waMessage = encodeURIComponent(
      `Assalamualaikum! I would like to book an appointment at K Dent.\n\n` +
        `Name: ${name}\n` +
        `Service: ${service}\n` +
        `Preferred Date: ${date}\n` +
        `Preferred Time: ${timeSlot}\n` +
        (notes ? `Notes: ${notes}\n` : "") +
        `\n(Booking ref: ${booking.id.slice(-6).toUpperCase()})`
    );
    const whatsappUrl = `https://wa.me/923325855589?text=${waMessage}`;

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      whatsappUrl,
    });
  } catch (error) {
    console.error("[BOOKINGS_POST]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please call us directly at 0332 5855589." },
      { status: 500 }
    );
  }
}
