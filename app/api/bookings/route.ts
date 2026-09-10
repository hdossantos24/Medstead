import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { nextBookingCode } from "@/lib/booking-code";
import { DESTINATIONS, ORIGINS, WAREHOUSE } from "@/lib/constants";
import { estimateFreight } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { bookingInput } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const parsed = bookingInput.safeParse(await req.json());
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message || "Invalid booking" }, { status: 400 });
  }

  const data = parsed.data;
  const user = await currentUser();
  const customerId = user && user.role === "CUSTOMER" ? user.id : undefined;
  const origin = ORIGINS.find((o) => o.code === data.originCode);
  const dest = DESTINATIONS.find((d) => d.code === data.destCode);

  const originLabel =
    data.originMode === "WAREHOUSE"
      ? "Fort Lauderdale warehouse"
      : origin && origin.code !== "OTH"
        ? origin.name
        : `${data.originCity}, ${data.originCountry}`;
  const destLabel = dest && dest.code !== "OTH" ? dest.name : `${data.destCity}, ${data.destCountry}`;

  const originCode = data.originMode === "WAREHOUSE" ? "FLL" : data.originCode;
  const bookingCode = await nextBookingCode(originCode, data.destCode);
  const estimateUsd = estimateFreight({
    service: data.service,
    weightLb: data.weightLb,
    pieces: data.pieces,
    destCode: data.destCode,
  });

  const booking = await prisma.booking.create({
    data: {
      bookingCode,
      userId: customerId,
      contactName: data.contactName.trim(),
      contactEmail: data.contactEmail.toLowerCase().trim(),
      contactPhone: data.contactPhone.trim(),
      originMode: data.originMode,
      originLabel,
      originCode,
      originAddress: data.originMode === "WAREHOUSE" ? WAREHOUSE.street : data.originAddress || null,
      originCity: data.originMode === "WAREHOUSE" ? WAREHOUSE.city : data.originCity,
      originRegion: data.originMode === "WAREHOUSE" ? WAREHOUSE.state : data.originRegion || null,
      originCountry: data.originMode === "WAREHOUSE" ? WAREHOUSE.country : data.originCountry,
      destLabel,
      destCode: data.destCode,
      destAddress: data.destAddress || null,
      destCity: data.destCity,
      destRegion: data.destRegion || null,
      destCountry: data.destCountry,
      pickupPoint: data.pickupPoint,
      service: data.service,
      cargoDescription: data.cargoDescription.trim(),
      weightLb: data.weightLb,
      pieces: data.pieces,
      lengthIn: data.lengthIn,
      widthIn: data.widthIn,
      heightIn: data.heightIn,
      readyDate: data.readyDate,
      timingNote: data.timingNote || null,
      notes: data.notes || null,
      status: "REQUESTED",
      estimateUsd,
      invoiceStatus: "none",
      paymentProvider: "invoice_pay_later",
      events: {
        create: {
          status: "REQUESTED",
          note: "Booking requested. No card charged. Invoice / pay later will follow from ops.",
        },
      },
    },
  });

  return NextResponse.json({
    bookingCode: booking.bookingCode,
    estimateUsd: booking.estimateUsd,
    status: booking.status,
  });
}
