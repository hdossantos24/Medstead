import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const gate = await requireOpsApi("view_trips");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") || 80), 200);

  const passengers = await prisma.passenger.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { boltPassengerId: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      movement: { select: { id: true, movementCode: true, originCode: true, destCode: true, status: true, faStatus: true } },
      profileUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ ok: true, passengers });
}
