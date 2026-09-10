import { NextRequest, NextResponse } from "next/server";
import { checkPassword, hashPassword, setUserCookie } from "@/lib/auth";
import { homePathForRole, isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { signupInput } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const parsed = signupInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check name, email, and a password of 8+ characters." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (isStaffRole(existing.role)) {
      return NextResponse.json({ error: "An account with that email already exists. Log in instead." }, { status: 409 });
    }
    const ok = await checkPassword(parsed.data.password, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "An account with that email already exists. Log in instead." }, { status: 409 });
    }
    if (!existing.active) {
      return NextResponse.json({ error: "This seat is disabled. Ask admin." }, { status: 403 });
    }
    setUserCookie(existing.id);
    return NextResponse.json({ ok: true, id: existing.id, role: existing.role, home: homePathForRole(existing.role) });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "CUSTOMER",
      active: true,
    },
  });

  await prisma.booking.updateMany({
    where: { contactEmail: email, userId: null },
    data: { userId: user.id },
  });

  setUserCookie(user.id);
  return NextResponse.json({ ok: true, id: user.id, role: user.role, home: "/account" });
}
