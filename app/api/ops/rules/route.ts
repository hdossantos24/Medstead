import { NextRequest, NextResponse } from "next/server";
import { ensureDefaultRules, requireOpsApi } from "@/lib/auth";
import { DEFAULT_RULES, PERMISSIONS, STAFF_ROLES, type StaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { staffRuleInput } from "@/lib/validators";

export async function GET() {
  const gate = await requireOpsApi("manage_employees");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });
  await ensureDefaultRules();
  const rules = await prisma.staffRule.findMany();
  return NextResponse.json({ rules, roles: STAFF_ROLES, permissions: PERMISSIONS, defaults: DEFAULT_RULES });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireOpsApi("manage_employees");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const parsed = staffRuleInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Role, permission key, and allowed are required." }, { status: 400 });
  }
  if (parsed.data.role === "ADMIN" && parsed.data.key === "manage_employees" && parsed.data.allowed === false) {
    return NextResponse.json({ error: "Admin must keep employee management." }, { status: 400 });
  }

  const rule = await prisma.staffRule.upsert({
    where: { role_key: { role: parsed.data.role as StaffRole, key: parsed.data.key } },
    update: { allowed: parsed.data.allowed },
    create: { role: parsed.data.role, key: parsed.data.key, allowed: parsed.data.allowed },
  });
  return NextResponse.json({ ok: true, rule });
}
