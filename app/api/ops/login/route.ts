import { NextRequest, NextResponse } from "next/server";
import { checkPassword, opsPinOk, setOpsCookie, setUserCookie } from "@/lib/auth";
import { homePathForRole, isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { pin?: string; email?: string; password?: string };

  if (body.email && body.password) {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (!user || !(await checkPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Those credentials do not match." }, { status: 401 });
    }
    if (!user.active || !isStaffRole(user.role)) {
      return NextResponse.json({ error: "Staff sign-in only. Customers use Account." }, { status: 403 });
    }
    setUserCookie(user.id);
    return NextResponse.json({ ok: true, role: user.role, home: homePathForRole(user.role) });
  }

  if (!body.pin || !opsPinOk(body.pin)) {
    return NextResponse.json({ error: "PIN not accepted" }, { status: 401 });
  }
  setOpsCookie();
  return NextResponse.json({ ok: true, role: "PIN", home: "/ops" });
}
