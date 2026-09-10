import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setUserCookie } from "@/lib/auth";
import { homePathForRole, isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { loginInput } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const parsed = loginInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Those credentials do not match." }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: "This seat is disabled. Ask admin." }, { status: 403 });
  }

  setUserCookie(user.id);
  return NextResponse.json({
    ok: true,
    role: user.role,
    home: homePathForRole(user.role),
    staff: isStaffRole(user.role),
  });
}
