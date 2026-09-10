import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireOpsApi("manage_schedule");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const movement = await prisma.movement.findFirst({
    where: { OR: [{ id: params.id }, { movementCode: decodeURIComponent(params.id) }] },
  });
  if (!movement) return NextResponse.json({ error: "Movement not found" }, { status: 404 });

  const body = (await req.json()) as { passengerId?: string; detach?: boolean };
  if (!body.passengerId) return NextResponse.json({ error: "passengerId required" }, { status: 400 });

  const passenger = await prisma.passenger.findUnique({ where: { id: body.passengerId } });
  if (!passenger) return NextResponse.json({ error: "Passenger not found" }, { status: 404 });

  const updated = await prisma.passenger.update({
    where: { id: passenger.id },
    data: { movementId: body.detach ? null : movement.id },
  });

  return NextResponse.json({ ok: true, passenger: updated });
}
