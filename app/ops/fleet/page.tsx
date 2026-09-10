import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth";
import { ensureFleetAircraft } from "@/lib/fleet";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fleet · ops" };

export default async function FleetPage() {
  await requireStaffPage(["ADMIN", "PILOT", "CARGO"]);
  const fleet = await ensureFleetAircraft();

  const rows = await Promise.all(
    fleet.map(async (a) => {
      const open = await prisma.movement.findMany({
        where: {
          aircraftId: a.id,
          status: { in: ["REQUESTED", "SCHEDULED", "DISPATCHED", "HOLD"] },
        },
        select: {
          id: true,
          movementCode: true,
          originCode: true,
          destCode: true,
          status: true,
          faStatus: true,
          faStatusText: true,
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      });
      return { ...a, open };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Flight ops</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Fleet</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Current tails on the internal board. Assign an aircraft on a trip to monitor it with FlightAware
        when the API key is configured.
      </p>

      <div className="mt-8 grid gap-4">
        {rows.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-navy-950">{a.tailNumber}</p>
                <p className="text-sm text-navy-800/60">
                  {a.label || "Fleet aircraft"}
                  {a.typeName ? ` · ${a.typeName}` : ""}
                </p>
                {a.notes && <p className="mt-1 text-xs text-navy-800/50">{a.notes}</p>}
              </div>
              <Badge tone={a.active ? "green" : "amber"}>{a.active ? "Active" : "Inactive"}</Badge>
            </div>
            {a.open.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-navy-800/70">
                {a.open.map((m) => (
                  <li key={m.id}>
                    <Link href="/ops/trips" className="font-semibold text-forest-700 hover:underline">
                      {m.movementCode}
                    </Link>{" "}
                    · {m.originCode} → {m.destCode} · {m.status}
                    {m.faStatus ? ` · FA ${m.faStatus}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-navy-800/55">No open trips on this tail.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
