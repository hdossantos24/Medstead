import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { isStaffRole } from "@/lib/staff";
import { MOVEMENT_STATUSES, type MovementStatusName } from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireOpsApi("manage_schedule");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const movement = await prisma.movement.findFirst({
    where: { OR: [{ id: params.id }, { movementCode: decodeURIComponent(params.id) }] },
  });
  if (!movement) return NextResponse.json({ error: "Movement not found" }, { status: 404 });

  const body = (await req.json()) as {
    assignedPilotId?: string | null;
    status?: MovementStatusName;
    notes?: string | null;
    bookingCode?: string | null;
  };

  if (body.status && !MOVEMENT_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Unknown movement status" }, { status: 400 });
  }

  if (body.assignedPilotId) {
    const pilot = await prisma.user.findUnique({ where: { id: body.assignedPilotId } });
    if (!pilot || !pilot.active || !isStaffRole(pilot.role) || (pilot.role !== "PILOT" && pilot.role !== "ADMIN")) {
      return NextResponse.json({ error: "Assign an active pilot seat." }, { status: 400 });
    }
  }

  const updated = await prisma.movement.update({
    where: { id: movement.id },
    data: {
      assignedPilotId: body.assignedPilotId === undefined ? movement.assignedPilotId : body.assignedPilotId,
      status: body.status ?? movement.status,
      notes: body.notes === undefined ? movement.notes : body.notes,
    },
  });

  if (body.bookingCode) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode: body.bookingCode.trim() } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await prisma.booking.update({ where: { id: booking.id }, data: { movementId: updated.id } });
  }

  if (body.assignedPilotId && body.assignedPilotId !== movement.assignedPilotId) {
    await prisma.workAssignment.create({
      data: {
        title: `Trip brief ${updated.movementCode}`,
        note: `${updated.originCode} → ${updated.destCode}. Acknowledge in-app.`,
        kind: "FLIGHT_TRIP",
        assigneeId: body.assignedPilotId,
        assignerId: gate.actor.kind === "staff" ? gate.actor.user.id : null,
        movementId: updated.id,
      },
    });
  }

  return NextResponse.json({ ok: true, movement: updated });
}
