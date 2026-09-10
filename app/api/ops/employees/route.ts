import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireOpsApi } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { employeeInput } from "@/lib/validators";

export async function GET() {
  const gate = await requireOpsApi("manage_employees");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const users = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const gate = await requireOpsApi("manage_employees");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const parsed = employeeInput.safeParse(await req.json());
  if (!parsed.success || !parsed.data.password) {
    return NextResponse.json({ error: "Name, email, role, and a password of 8+ characters are required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      active: parsed.data.active ?? true,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true },
  });
  return NextResponse.json({ ok: true, user });
}
