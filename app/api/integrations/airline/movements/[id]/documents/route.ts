import { NextRequest, NextResponse } from "next/server";
import { requireAirlineSeam } from "@/lib/airline-auth";
import { DOCUMENT_KINDS, type DocumentWrite } from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAirlineSeam(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });

  const movement = await prisma.movement.findFirst({
    where: { OR: [{ id: params.id }, { movementCode: decodeURIComponent(params.id) }] },
  });
  if (!movement) return NextResponse.json({ error: "Movement not found" }, { status: 404 });

  const body = (await req.json()) as DocumentWrite;
  if (!DOCUMENT_KINDS.includes(body.kind) || !body.reference?.trim()) {
    return NextResponse.json(
      { error: "kind must be one of COMMERCIAL_INVOICE, PACKING_LIST, AIR_WAYBILL, CUSTOMS_DECLARATION, MANIFEST" },
      { status: 400 },
    );
  }

  let bookingId: string | null = null;
  if (body.bookingCode) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode: body.bookingCode } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    bookingId = booking.id;
  }

  const document = await prisma.movementDocument.create({
    data: {
      kind: body.kind,
      reference: body.reference.trim(),
      note: body.note ?? null,
      movementId: movement.id,
      bookingId,
    },
  });
  return NextResponse.json({ ok: true, document });
}
