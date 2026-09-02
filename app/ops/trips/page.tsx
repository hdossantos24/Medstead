import { NextQueue } from "@/components/next-queue";
import { Badge, Card } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth";
import { loadDeskQueue } from "@/lib/desk";
import { DOCUMENT_KIND_LABEL, MOVEMENT_STATUS_LABEL, type DocumentKindName, type MovementStatusName } from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";
import type { MovementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trip assignments" };

export default async function TripsPage() {
  const actor = await requireStaffPage(["ADMIN", "PILOT"]);
  const items = await loadDeskQueue(actor);
  const openStatuses: MovementStatus[] = ["REQUESTED", "SCHEDULED", "DISPATCHED"];
  const movements = await prisma.movement.findMany({
    where: {
      status: { in: openStatuses },
      ...(actor.kind === "staff" && actor.user.role === "PILOT" ? { assignedPilotId: actor.user.id } : {}),
    },
    include: {
      assignedPilot: { select: { name: true } },
      bookings: { select: { bookingCode: true, status: true, destLabel: true } },
      documents: true,
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  const briefs = items.filter((i) => i.kind === "acknowledge_brief" || i.id === "pilot-clear");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Pilot · trip assignments</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Trip board</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Assigned cargo and passenger movements from the shared schedule. This is not a public charter
        desk and not a live Part 135 product. The MTG Airways app will write more legs here later.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Next job</p>
        <NextQueue items={briefs.slice(0, 2)} hero />
      </div>

      <div className="mt-8 grid gap-4">
        {movements.length === 0 && (
          <Card className="p-6">
            <p className="font-semibold text-navy-950">No trip brief waiting</p>
            <p className="mt-2 text-sm text-navy-800/65">
              When ops assigns a movement, or the airline app posts a passenger/cargo leg, it lands here.
            </p>
          </Card>
        )}
        {movements.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-950">{m.movementCode}</p>
                <p className="text-sm text-navy-800/60">
                  {m.originCode} → {m.destCode} · {m.kind === "PASSENGER" ? "Passenger" : "Cargo"} ·{" "}
                  {m.operatorName}
                </p>
                {m.assignedPilot && <p className="mt-1 text-sm text-navy-800/60">Pilot {m.assignedPilot.name}</p>}
              </div>
              <Badge>{MOVEMENT_STATUS_LABEL[m.status as MovementStatusName]}</Badge>
            </div>
            {m.notes && <p className="mt-3 text-sm text-navy-800/70">{m.notes}</p>}
            {m.bookings.length > 0 && (
              <ul className="mt-3 text-sm text-navy-800/70">
                {m.bookings.map((b) => (
                  <li key={b.bookingCode}>
                    {b.bookingCode} · {b.destLabel} · {b.status}
                  </li>
                ))}
              </ul>
            )}
            {m.documents.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.documents.map((d) => (
                  <Badge key={d.id} tone="navy">
                    {DOCUMENT_KIND_LABEL[d.kind as DocumentKindName]} · {d.reference}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
