import { NextRequest, NextResponse } from "next/server";
import { requireAirlineSeam } from "@/lib/airline-auth";
import {
  MOVEMENT_KINDS,
  MOVEMENT_STATUSES,
  nextMovementCode,
  type MovementKindName,
  type MovementStatusName,
  type MovementWrite,
} from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const gate = await requireAirlineSeam(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });

  const movements = await prisma.movement.findMany({
    include: {
      assignedPilot: { select: { id: true, name: true, email: true, role: true } },
      bookings: { select: { bookingCode: true, status: true, weightLb: true, pieces: true } },
      documents: true,
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({
    movements,
    ownedBy: "medstead",
    airlineProduct: "separate-app",
    part135Live: false,
    operatorName: "MTG Airways",
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAirlineSeam(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });

  const body = (await req.json()) as MovementWrite;
  if (!MOVEMENT_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "kind must be CARGO or PASSENGER" }, { status: 400 });
  }
  if (!body.originCode || !body.destCode) {
    return NextResponse.json({ error: "originCode and destCode are required" }, { status: 400 });
  }
  if (body.status && !MOVEMENT_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Unknown movement status" }, { status: 400 });
  }

  const movementCode = body.movementCode?.trim() || nextMovementCode(body.kind, body.originCode, body.destCode);
  const status = (body.status || "REQUESTED") as MovementStatusName;
  const kind = body.kind as MovementKindName;

  const movement = await prisma.movement.upsert({
    where: { movementCode },
    update: {
      kind,
      status,
      originCode: body.originCode,
      destCode: body.destCode,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      capacityWeightLb: body.capacityWeightLb ?? null,
      capacityPieces: body.capacityPieces ?? null,
      capacitySeats: body.capacitySeats ?? null,
      notes: body.notes ?? null,
      assignedPilotId: body.assignedPilotId ?? null,
      operatorName: "MTG Airways",
    },
    create: {
      movementCode,
      kind,
      status,
      originCode: body.originCode,
      destCode: body.destCode,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      capacityWeightLb: body.capacityWeightLb ?? null,
      capacityPieces: body.capacityPieces ?? null,
      capacitySeats: body.capacitySeats ?? null,
      notes: body.notes ?? null,
      assignedPilotId: body.assignedPilotId ?? null,
      operatorName: "MTG Airways",
    },
  });

  if (body.bookingCodes?.length) {
    await prisma.booking.updateMany({
      where: { bookingCode: { in: body.bookingCodes } },
      data: { movementId: movement.id },
    });
  }

  return NextResponse.json({ ok: true, movement });
}
