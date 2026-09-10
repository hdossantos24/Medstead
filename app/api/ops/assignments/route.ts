import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { assignmentInput } from "@/lib/validators";

export async function GET() {
  const gate = await requireOpsApi();
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const where =
    gate.actor.kind === "staff" && gate.actor.user.role !== "ADMIN"
      ? { assigneeId: gate.actor.user.id }
      : {};

  const assignments = await prisma.workAssignment.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, role: true } },
      booking: { select: { bookingCode: true, contactName: true } },
      movement: { select: { movementCode: true, originCode: true, destCode: true, kind: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const gate = await requireOpsApi("assign_work");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const parsed = assignmentInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Title, assignee, and kind are required." }, { status: 400 });
  }

  const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assigneeId } });
  if (!assignee || !assignee.active || !isStaffRole(assignee.role)) {
    return NextResponse.json({ error: "Assign work to an active employee." }, { status: 400 });
  }

  let bookingId: string | null = null;
  if (parsed.data.bookingCode) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode: parsed.data.bookingCode.trim() } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    bookingId = booking.id;
  }

  let movementId: string | null = null;
  if (parsed.data.movementCode) {
    const movement = await prisma.movement.findUnique({ where: { movementCode: parsed.data.movementCode.trim() } });
    if (!movement) return NextResponse.json({ error: "Movement not found" }, { status: 404 });
    movementId = movement.id;
  }

  const assignment = await prisma.workAssignment.create({
    data: {
      title: parsed.data.title.trim(),
      note: parsed.data.note || null,
      kind: parsed.data.kind,
      assigneeId: assignee.id,
      assignerId: gate.actor.kind === "staff" ? gate.actor.user.id : null,
      bookingId,
      movementId,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });
  return NextResponse.json({ ok: true, assignment });
}
