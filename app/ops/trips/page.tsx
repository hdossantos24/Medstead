import {
  AssignPilotForm,
  AssignStaffForm,
  AttachBookingForm,
  AttachPassengerForm,
  CreateMovementForm,
  EditMovementForm,
  SyncFlightAwareButton,
} from "@/components/trip-desk";
import { FaBadge } from "@/components/fa-badge";
import { NextQueue } from "@/components/next-queue";
import { Badge, Card } from "@/components/ui";
import { actorAllows, requireStaffPage } from "@/lib/auth";
import { loadDeskQueue } from "@/lib/desk";
import {
  DOCUMENT_KIND_LABEL,
  MOVEMENT_STATUS_LABEL,
  type DocumentKindName,
  type MovementStatusName,
} from "@/lib/airline-seam";
import { ensureFleetAircraft } from "@/lib/fleet";
import { flightAwareConfigured } from "@/lib/flightaware";
import { prisma } from "@/lib/prisma";
import type { MovementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flight ops · trips" };

export default async function TripsPage() {
  const actor = await requireStaffPage(["ADMIN", "PILOT", "CARGO", "STAFF"]);
  const items = await loadDeskQueue(actor);
  const canAssign = await actorAllows(actor, "manage_schedule");
  const role = actor.kind === "staff" ? actor.user.role : "STAFF";
  const openStatuses: MovementStatus[] = ["REQUESTED", "SCHEDULED", "DISPATCHED", "HOLD"];
  const faConfigured = flightAwareConfigured();

  const movements = await prisma.movement.findMany({
    where: {
      status: { in: openStatuses },
      ...(role === "PILOT" && actor.kind === "staff" ? { assignedPilotId: actor.user.id } : {}),
      ...(role === "CARGO" ? { kind: "CARGO" } : {}),
    },
    include: {
      assignedPilot: { select: { name: true } },
      aircraft: { select: { id: true, tailNumber: true, label: true } },
      bookings: { select: { bookingCode: true, status: true, destLabel: true } },
      passengers: { select: { id: true, name: true, email: true } },
      documents: true,
      assignments: {
        where: { status: "OPEN" },
        select: { id: true, title: true, assignee: { select: { name: true } } },
        take: 6,
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  const [pilots, bookings, aircraft, freePassengers, staff] = canAssign
    ? await Promise.all([
        prisma.user.findMany({
          where: { role: { in: ["PILOT", "ADMIN"] }, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.booking.findMany({
          where: { status: { not: "DELIVERED" } },
          select: { bookingCode: true },
          orderBy: { createdAt: "desc" },
          take: 40,
        }),
        ensureFleetAircraft(),
        prisma.passenger.findMany({
          where: { movementId: null },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 80,
        }),
        prisma.user.findMany({
          where: { role: { in: ["ADMIN", "STAFF", "PILOT", "CARGO"] }, active: true },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], [], [], []];

  const briefs = items.filter((i) => i.kind === "acknowledge_brief" || i.id === "pilot-clear");
  const eyebrow =
    role === "CARGO"
      ? "Flight ops · cargo"
      : role === "ADMIN"
        ? "Flight ops · admin"
        : role === "PILOT"
          ? "Flight ops · pilot"
          : "Flight ops";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Flight ops · trips</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        One board for cargo bookings and passengers on each movement. Live FlightAware badges when{" "}
        <code className="text-xs">FLIGHTAWARE_API_KEY</code> is set in Vercel — otherwise the monitor
        stays offline without inventing times.
      </p>

      <div className="mt-4">
        <SyncFlightAwareButton configured={faConfigured} />
      </div>

      {canAssign && (
        <div className="mt-8">
          <CreateMovementForm
            pilots={pilots}
            bookings={bookings}
            aircraft={aircraft.map((a) => ({ id: a.id, tailNumber: a.tailNumber, label: a.label }))}
            passengers={freePassengers}
          />
        </div>
      )}

      {(role === "PILOT" || role === "ADMIN") && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Next job</p>
          <NextQueue items={briefs.slice(0, 2)} hero />
        </div>
      )}

      <div className="mt-8 grid gap-4">
        {movements.length === 0 && (
          <Card className="p-6">
            <p className="font-semibold text-navy-950">No open trips</p>
            <p className="mt-2 text-sm text-navy-800/65">
              Create a movement to attach freight and people. Public customers still book freight at Ship Now.
            </p>
          </Card>
        )}
        {movements.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-950">{m.movementCode}</p>
                <p className="text-sm text-navy-800/60">
                  {m.originCode} → {m.destCode} · {m.kind === "PASSENGER" ? "Passenger" : "Cargo"}
                  {m.aircraft ? ` · ${m.aircraft.tailNumber}` : ""}
                  {m.flightIdent ? ` · ident ${m.flightIdent}` : ""}
                </p>
                {m.assignedPilot && (
                  <p className="mt-1 text-sm text-navy-800/60">Pilot {m.assignedPilot.name}</p>
                )}
                {faConfigured && m.lastSyncedAt ? (
                  <p className="mt-1 text-xs text-navy-800/45">
                    FA synced {m.lastSyncedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </p>
                ) : !faConfigured ? (
                  <p className="mt-1 text-xs text-navy-800/45">Live FA times hidden until FLIGHTAWARE_API_KEY is set</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{MOVEMENT_STATUS_LABEL[m.status as MovementStatusName]}</Badge>
                <FaBadge status={m.faStatus} text={m.faStatusText} configured={faConfigured} />
              </div>
            </div>
            {m.notes && <p className="mt-3 text-sm text-navy-800/70">{m.notes}</p>}
            {m.bookings.length > 0 && (
              <ul className="mt-3 text-sm text-navy-800/70">
                {m.bookings.map((b) => (
                  <li key={b.bookingCode}>
                    Freight {b.bookingCode} · {b.destLabel} · {b.status}
                  </li>
                ))}
              </ul>
            )}
            {m.passengers.length > 0 && (
              <ul className="mt-2 text-sm text-navy-800/70">
                {m.passengers.map((p) => (
                  <li key={p.id}>
                    Passenger {p.name}
                    {p.email ? ` · ${p.email}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {m.assignments.length > 0 && (
              <ul className="mt-2 text-xs text-navy-800/55">
                {m.assignments.map((a) => (
                  <li key={a.id}>
                    {a.title} → {a.assignee.name}
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
            {canAssign && (
              <>
                <EditMovementForm
                  movementId={m.id}
                  status={m.status}
                  aircraftId={m.aircraftId}
                  flightIdent={m.flightIdent}
                  aircraft={aircraft.map((a) => ({
                    id: a.id,
                    tailNumber: a.tailNumber,
                    label: a.label,
                  }))}
                />
                {pilots.length > 0 && (
                  <AssignPilotForm
                    movementId={m.id}
                    pilots={pilots}
                    currentPilotId={m.assignedPilotId}
                  />
                )}
                <AttachBookingForm movementId={m.id} bookings={bookings} />
                <AttachPassengerForm movementId={m.id} passengers={freePassengers} />
                <AssignStaffForm movementId={m.id} staff={staff} />
                <div className="mt-3">
                  <SyncFlightAwareButton movementId={m.id} configured={faConfigured} />
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
