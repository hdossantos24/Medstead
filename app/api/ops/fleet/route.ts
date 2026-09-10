import { NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth";
import { ensureFleetAircraft } from "@/lib/fleet";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gate = await requireOpsApi("view_trips");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const fleet = await ensureFleetAircraft();
  const withCounts = await Promise.all(
    fleet.map(async (a) => {
      const openTrips = await prisma.movement.count({
        where: {
          aircraftId: a.id,
          status: { in: ["REQUESTED", "SCHEDULED", "DISPATCHED", "HOLD"] },
        },
      });
      return { ...a, openTrips };
    }),
  );
  return NextResponse.json({ ok: true, fleet: withCounts });
}

export async function POST() {
  const gate = await requireOpsApi("manage_schedule");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const fleet = await ensureFleetAircraft();
  return NextResponse.json({ ok: true, fleet, seeded: true });
}
