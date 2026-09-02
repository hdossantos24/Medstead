import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireOpsApi } from "@/lib/auth";
import { isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { employeeInput } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireOpsApi("manage_employees");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user || !isStaffRole(user.role)) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const parsed = employeeInput.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check name, email, role, and password." }, { status: 400 });
  }

  const nextRole = parsed.data.role ?? user.role;
  const nextActive = parsed.data.active ?? user.active;
  if (user.role === "ADMIN" && (nextRole !== "ADMIN" || nextActive === false)) {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: user.id } } });
    if (admins === 0) {
      return NextResponse.json({ error: "Keep at least one active admin." }, { status: 400 });
    }
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase().trim();
    const clash = await prisma.user.findFirst({ where: { email, id: { not: user.id } } });
    if (clash) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name?.trim() ?? user.name,
      email: parsed.data.email?.toLowerCase().trim() ?? user.email,
      phone: parsed.data.phone === undefined ? user.phone : parsed.data.phone || null,
      role: nextRole,
      active: nextActive,
      ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true },
  });
  return NextResponse.json({ ok: true, user: updated });
}
