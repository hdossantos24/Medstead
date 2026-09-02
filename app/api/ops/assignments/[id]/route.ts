import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireOpsApi();
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const assignment = await prisma.workAssignment.findUnique({ where: { id: params.id } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const body = (await req.json()) as { status?: "OPEN" | "DONE" };
  if (body.status !== "OPEN" && body.status !== "DONE") {
    return NextResponse.json({ error: "Status must be OPEN or DONE." }, { status: 400 });
  }

  const isAdmin = gate.actor.kind === "staff" && gate.actor.user.role === "ADMIN";
  const isOwner = gate.actor.kind === "staff" && gate.actor.user.id === assignment.assigneeId;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "That seat cannot close this assignment." }, { status: 403 });
  }

  const updated = await prisma.workAssignment.update({
    where: { id: assignment.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, assignment: updated });
}
