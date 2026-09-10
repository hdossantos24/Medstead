import { NextRequest, NextResponse } from "next/server";
import { requireAirlineSeam } from "@/lib/airline-auth";
import { STAFF_ROLES } from "@/lib/staff";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const gate = await requireAirlineSeam(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] }, active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    staff: users,
    note: "Same employee directory as freight ops. Do not create a second staff table in the airline app.",
  });
}
