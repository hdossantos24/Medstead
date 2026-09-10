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
    aircraftId?: string | null;
    flightIdent?: string | null;
    scheduledAt?: string | null;
    passengerIds?: string[];
    staffAssigneeId?: string | null;
    staffTitle?: string | null;
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

  if (body.aircraftId) {
    const ac = await prisma.aircraft.findUnique({ where: { id: body.aircraftId } });
    if (!ac || !ac.active) return NextResponse.json({ error: "Unknown or inactive aircraft." }, { status: 400 });
  }

  const updated = await prisma.movement.update({
    where: { id: movement.id },
    data: {
      assignedPilotId: body.assignedPilotId === undefined ? movement.assignedPilotId : body.assignedPilotId,
      status: body.status ?? movement.status,
      notes: body.notes === undefined ? movement.notes : body.notes,
      aircraftId: body.aircraftId === undefined ? movement.aircraftId : body.aircraftId,
      flightIdent:
        body.flightIdent === undefined
          ? movement.flightIdent
          : body.flightIdent
            ? body.flightIdent.trim().toUpperCase()
            : null,
      scheduledAt:
        body.scheduledAt === undefined
          ? movement.scheduledAt
          : body.scheduledAt
            ? new Date(body.scheduledAt)
            : null,
    },
  });

  if (body.bookingCode) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode: body.bookingCode.trim() } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await prisma.booking.update({ where: { id: booking.id }, data: { movementId: updated.id } });
  }

  if (body.passengerIds) {
    await prisma.passenger.updateMany({
      where: { movementId: updated.id, id: { notIn: body.passengerIds } },
      data: { movementId: null },
    });
    if (body.passengerIds.length) {
      await prisma.passenger.updateMany({
        where: { id: { in: body.passengerIds } },
        data: { movementId: updated.id },
      });
    }
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

  if (body.staffAssigneeId) {
    const staff = await prisma.user.findUnique({ where: { id: body.staffAssigneeId } });
    if (!staff || !staff.active || !isStaffRole(staff.role)) {
      return NextResponse.json({ error: "Assign an active staff seat." }, { status: 400 });
    }
    await prisma.workAssignment.create({
      data: {
        title: body.staffTitle?.trim() || `Support ${updated.movementCode}`,
        note: `${updated.originCode} → ${updated.destCode}`,
        kind: "FLIGHT_TRIP",
        assigneeId: body.staffAssigneeId,
        assignerId: gate.actor.kind === "staff" ? gate.actor.user.id : null,
        movementId: updated.id,
      },
    });
  }

  return NextResponse.json({ ok: true, movement: updated });
}
