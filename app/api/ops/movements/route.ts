import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { isStaffRole } from "@/lib/staff";
import { MOVEMENT_KINDS, nextMovementCode, type MovementKindName } from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const gate = await requireOpsApi("manage_schedule");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as {
    kind?: MovementKindName;
    originCode?: string;
    destCode?: string;
    scheduledAt?: string | null;
    capacityWeightLb?: number | null;
    capacityPieces?: number | null;
    capacitySeats?: number | null;
    assignedPilotId?: string | null;
    bookingCode?: string | null;
    notes?: string | null;
  };

  if (!body.kind || !MOVEMENT_KINDS.includes(body.kind) || !body.originCode || !body.destCode) {
    return NextResponse.json({ error: "kind, originCode, and destCode are required." }, { status: 400 });
  }

  if (body.assignedPilotId) {
    const pilot = await prisma.user.findUnique({ where: { id: body.assignedPilotId } });
    if (!pilot || !pilot.active || !isStaffRole(pilot.role) || (pilot.role !== "PILOT" && pilot.role !== "ADMIN")) {
      return NextResponse.json({ error: "Assign an active pilot seat." }, { status: 400 });
    }
  }

  const origin = body.originCode.trim().toUpperCase();
  const dest = body.destCode.trim().toUpperCase();
  const movement = await prisma.movement.create({
    data: {
      movementCode: nextMovementCode(body.kind, origin, dest),
      kind: body.kind,
      status: "SCHEDULED",
      originCode: origin,
      destCode: dest,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      capacityWeightLb: body.capacityWeightLb ?? null,
      capacityPieces: body.capacityPieces ?? null,
      capacitySeats: body.capacitySeats ?? null,
      assignedPilotId: body.assignedPilotId || null,
      notes: body.notes || null,
      operatorName: "MTG Airways",
    },
  });

  if (body.bookingCode) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode: body.bookingCode.trim() } });
    if (booking) {
      await prisma.booking.update({ where: { id: booking.id }, data: { movementId: movement.id } });
    }
  }

  if (body.assignedPilotId) {
    await prisma.workAssignment.create({
      data: {
        title: `Trip brief ${movement.movementCode}`,
        note: `${movement.originCode} → ${movement.destCode}. Acknowledge in-app.`,
        kind: "FLIGHT_TRIP",
        assigneeId: body.assignedPilotId,
        assignerId: gate.actor.kind === "staff" ? gate.actor.user.id : null,
        movementId: movement.id,
      },
    });
  }

  return NextResponse.json({ ok: true, movement });
}
