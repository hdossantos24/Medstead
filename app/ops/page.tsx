import Link from "next/link";
import { FaBadge } from "@/components/fa-badge";
import { NextQueue } from "@/components/next-queue";
import { OpsLogin } from "@/components/ops-desk";
import { Badge, Card } from "@/components/ui";
import { actorAllows, getOpsActor } from "@/lib/auth";
import { loadDeskQueue } from "@/lib/desk";
import { ensureFleetAircraft } from "@/lib/fleet";
import { flightAwareConfigured } from "@/lib/flightaware";
import { prisma } from "@/lib/prisma";
import { ROLE_EYEBROW, homePathForRole, isStaffRole, type StaffRole } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops desk" };

export default async function OpsPage() {
  const actor = await getOpsActor();
  if (!actor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Internal</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">Ops desk</h1>
        <p className="mt-3 text-sm text-navy-800/70">
          Freight orders and flight ops in one hive. Update tracking, issue invoices, mark wire/cash
          paid, and run trips without leaving this app.
        </p>
        <div className="mt-6">
          <OpsLogin />
        </div>
      </div>
    );
  }

  if (actor.kind === "staff" && isStaffRole(actor.user.role) && actor.user.role !== "ADMIN") {
    const home = homePathForRole(actor.user.role);
    if (home !== "/ops") {
      const { redirect } = await import("next/navigation");
      redirect(home);
    }
  }

  const items = await loadDeskQueue(actor);
  const faConfigured = flightAwareConfigured();
  const [openBookings, warehouse, openWork, movements, passengerCount, fleet, callCount] = await Promise.all([
    prisma.booking.count({ where: { status: { not: "DELIVERED" } } }),
    prisma.booking.count({ where: { status: { in: ["PAID", "RECEIVED"] } } }),
    prisma.workAssignment.count({ where: { status: "OPEN" } }),
    prisma.movement.findMany({
      where: { status: { in: ["REQUESTED", "SCHEDULED", "DISPATCHED", "HOLD"] } },
      include: {
        aircraft: { select: { tailNumber: true } },
        bookings: { select: { bookingCode: true } },
        passengers: { select: { id: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.passenger.count(),
    ensureFleetAircraft(),
    prisma.callLog.count(),
  ]);

  const role: StaffRole =
    actor.kind === "staff" && isStaffRole(actor.user.role) ? actor.user.role : "STAFF";
  const eyebrow = actor.kind === "pin" ? "Break-glass PIN" : ROLE_EYEBROW[role];
  const canPeople = actor.kind === "staff" && (await actorAllows(actor, "manage_employees"));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Do this next</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Single staff hive: freight next-actions and open trips together. FlightAware monitor{" "}
        {faConfigured ? "is configured" : "is offline until FLIGHTAWARE_API_KEY is set in Vercel"}.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Next job</p>
        <NextQueue items={items.slice(0, 1)} hero />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/ops/orders"
          className="flex min-h-[120px] flex-col justify-between rounded-3xl bg-navy-950 p-6 text-white"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Freight</p>
          <p className="text-3xl font-semibold">Orders</p>
          <p className="text-sm text-white/70">{openBookings} open · {warehouse} warehouse/paid</p>
        </Link>
        <Link
          href="/ops/trips"
          className="flex min-h-[120px] flex-col justify-between rounded-3xl bg-forest-600 p-6 text-white"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Flight ops</p>
          <p className="text-3xl font-semibold">Trips</p>
          <p className="text-sm text-white/80">{movements.length}+ open movements</p>
        </Link>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
            Open trips · live status
          </p>
          <Badge tone={faConfigured ? "green" : "navy"}>
            {faConfigured ? "FlightAware on" : "FA not configured"}
          </Badge>
        </div>
        {movements.length === 0 ? (
          <p className="mt-3 text-sm text-navy-800/60">No open trips. Create one under Flight ops.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-navy-900/5 pb-3 last:border-0">
                <div>
                  <Link href="/ops/trips" className="font-semibold text-navy-950 hover:text-forest-700">
                    {m.movementCode}
                  </Link>
                  <p className="text-sm text-navy-800/60">
                    {m.originCode} → {m.destCode}
                    {m.aircraft ? ` · ${m.aircraft.tailNumber}` : ""}
                    {m.bookings.length ? ` · ${m.bookings.length} freight` : ""}
                    {m.passengers.length ? ` · ${m.passengers.length} pax` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="navy">{m.status}</Badge>
                  <FaBadge status={m.faStatus} text={m.faStatusText} configured={faConfigured} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Assignments</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{openWork}</p>
          <Link href="/ops/assignments" className="mt-1 text-sm font-semibold text-forest-700">
            Next actions
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Call Log</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{callCount}</p>
          <Link href="/ops/calls" className="mt-1 text-sm font-semibold text-forest-700">
            Phone intake
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Passengers</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{passengerCount}</p>
          <Link href="/ops/passengers" className="mt-1 text-sm font-semibold text-forest-700">
            People desk
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Fleet</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{fleet.length}</p>
          <Link href="/ops/fleet" className="mt-1 text-sm font-semibold text-forest-700">
            Tails
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {canPeople ? (
          <Link
            href="/ops/employees"
            className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-navy-900/10 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">People</p>
            <p className="text-xl font-semibold text-navy-950">Employees</p>
          </Link>
        ) : (
          <Link
            href="/ops/assignments"
            className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-navy-900/10 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Work</p>
            <p className="text-xl font-semibold text-navy-950">Assignments</p>
          </Link>
        )}
        <Link
          href="/ops/passengers"
          className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-navy-900/10 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Hive</p>
          <p className="text-xl font-semibold text-navy-950">Passengers + trips</p>
        </Link>
      </div>

      {items.length > 1 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
            After this · {items.length - 1} more
          </p>
          <NextQueue items={items.slice(1, 4)} />
        </div>
      )}

      {actor.kind === "pin" && (
        <Card className="mt-6 p-5">
          <Badge tone="amber">Break-glass PIN</Badge>
          <p className="mt-2 text-sm leading-6 text-navy-800/70">
            PIN can update tracking and invoices. It cannot manage employees or the schedule. Day-to-day
            staff should use their own login.
          </p>
        </Card>
      )}
    </div>
  );
}
