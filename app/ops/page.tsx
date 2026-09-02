import Link from "next/link";
import { NextQueue } from "@/components/next-queue";
import { OpsLogin } from "@/components/ops-desk";
import { Badge, Card } from "@/components/ui";
import { actorAllows, getOpsActor } from "@/lib/auth";
import { loadDeskQueue } from "@/lib/desk";
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
          Update tracking and issue invoice / pay-later. This is not a customer page. Each employee
          signs in with their own work email.
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
  const [openBookings, warehouse, openWork, movements] = await Promise.all([
    prisma.booking.count({ where: { status: { not: "DELIVERED" } } }),
    prisma.booking.count({ where: { status: { in: ["PAID", "RECEIVED"] } } }),
    prisma.workAssignment.count({ where: { status: "OPEN" } }),
    prisma.movement.count({ where: { status: { in: ["REQUESTED", "SCHEDULED", "DISPATCHED"] } } }),
  ]);

  const role: StaffRole = actor.kind === "staff" && isStaffRole(actor.user.role) ? actor.user.role : "STAFF";
  const eyebrow = actor.kind === "pin" ? "Break-glass PIN" : ROLE_EYEBROW[role];
  const canPeople = actor.kind === "staff" && (await actorAllows(actor, "manage_employees"));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Do this next</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        One platform. Freight bookings and staff assignments. Simulated tracking is OK in v1. Invoice /
        pay later — no card rail is live.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Next job</p>
        <NextQueue items={items.slice(0, 1)} hero />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/ops/orders" className="flex min-h-[120px] flex-col justify-between rounded-3xl bg-navy-950 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Pick / pack</p>
          <p className="text-3xl font-semibold">Orders</p>
          <p className="text-sm text-white/70">{openBookings} open bookings</p>
        </Link>
        <Link href="/ops/orders" className="flex min-h-[120px] flex-col justify-between rounded-3xl bg-forest-600 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Ship / track</p>
          <p className="text-3xl font-semibold">Packages</p>
          <p className="text-sm text-white/80">{warehouse} at warehouse or paid</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Assigned work</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{openWork} open</p>
          <p className="mt-1 text-sm text-navy-800/60">
            <Link href="/ops/assignments" className="font-semibold text-forest-700">
              Next actions
            </Link>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Shared schedule</p>
          <p className="mt-2 text-3xl font-semibold text-navy-950">{movements} movements</p>
          <p className="mt-1 text-sm text-navy-800/60">Cargo now. Passenger legs reserved for the MTG Airways app.</p>
        </Card>
      </div>

      {canPeople && (
        <Card className="mt-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Employees</p>
          <p className="mt-2 text-sm text-navy-800/70">Create seats, set roles, and toggle rules.</p>
          <p className="mt-3">
            <Link href="/ops/employees" className="text-sm font-semibold text-forest-700 hover:underline">
              Open people
            </Link>
          </p>
        </Card>
      )}

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
            PIN can update tracking and invoices. It cannot manage employees. Day-to-day staff should
            use their own login.
          </p>
        </Card>
      )}
    </div>
  );
}
