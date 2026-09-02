import { NextQueue } from "@/components/next-queue";
import { AssignPilotForm } from "@/components/trip-desk";
import { Badge, Card } from "@/components/ui";
import { actorAllows, requireStaffPage } from "@/lib/auth";
import { loadDeskQueue } from "@/lib/desk";
import { DOCUMENT_KIND_LABEL, MOVEMENT_STATUS_LABEL, type DocumentKindName, type MovementStatusName } from "@/lib/airline-seam";
import { prisma } from "@/lib/prisma";
import type { MovementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trip assignments" };

export default async function TripsPage() {
  const actor = await requireStaffPage(["ADMIN", "PILOT", "CARGO"]);
  const items = await loadDeskQueue(actor);
  const canAssign = await actorAllows(actor, "manage_schedule");
  const role = actor.kind === "staff" ? actor.user.role : "STAFF";
  const openStatuses: MovementStatus[] = ["REQUESTED", "SCHEDULED", "DISPATCHED"];
  const movements = await prisma.movement.findMany({
    where: {
      status: { in: openStatuses },
      ...(role === "PILOT" && actor.kind === "staff" ? { assignedPilotId: actor.user.id } : {}),
      ...(role === "CARGO" ? { kind: "CARGO" } : {}),
    },
    include: {
      assignedPilot: { select: { name: true } },
      bookings: { select: { bookingCode: true, status: true, destLabel: true } },
      documents: true,
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  const pilots = canAssign
    ? await prisma.user.findMany({
        where: { role: { in: ["PILOT", "ADMIN"] }, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const briefs = items.filter((i) => i.kind === "acknowledge_brief" || i.id === "pilot-clear");
  const eyebrow =
    role === "CARGO" ? "Cargo · warehouse movements" : role === "ADMIN" ? "Admin · internal board" : "Pilot · trip assignments";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Trip board</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Internal cargo and passenger movements. Staff operate this board now. There is no public
        airline door on this site and Part 135 is not live. A later MTG Airways customer app will
        write more legs into the same schedule.
      </p>

      {(role === "PILOT" || role === "ADMIN") && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Next job</p>
          <NextQueue items={briefs.slice(0, 2)} hero />
        </div>
      )}

      <div className="mt-8 grid gap-4">
        {movements.length === 0 && (
          <Card className="p-6">
            <p className="font-semibold text-navy-950">No trip brief waiting</p>
            <p className="mt-2 text-sm text-navy-800/65">
              When ops assigns a movement, it lands here. Public customers still book freight at Ship Now.
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
            {canAssign && pilots.length > 0 && (
              <AssignPilotForm movementId={m.id} pilots={pilots} currentPilotId={m.assignedPilotId} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
