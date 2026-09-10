import { NextQueue } from "@/components/next-queue";
import { AssignmentDesk } from "@/components/assignment-desk";
import { actorAllows, requireStaffPage } from "@/lib/auth";
import { loadDeskQueue, staffDirectory } from "@/lib/desk";
import { prisma } from "@/lib/prisma";
import type { AssignmentKindName, StaffRole } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Next actions" };

export default async function AssignmentsPage() {
  const actor = await requireStaffPage(["ADMIN", "STAFF", "CARGO", "PILOT"]);
  const canAssign = await actorAllows(actor, "assign_work");
  const items = await loadDeskQueue(actor);
  const where =
    actor.kind === "staff" && actor.user.role !== "ADMIN" ? { assigneeId: actor.user.id } : {};

  const [assignments, people, bookings, movements] = await Promise.all([
    prisma.workAssignment.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        booking: { select: { bookingCode: true, contactName: true } },
        movement: { select: { movementCode: true, originCode: true, destCode: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    staffDirectory(),
    prisma.booking.findMany({ select: { bookingCode: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.movement.findMany({
      select: { movementCode: true, originCode: true, destCode: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Next</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Do this next</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Assigned work plus the next legal step on an open booking. One button. No guessing.
      </p>
      <div className="mt-8">
        <NextQueue items={items.slice(0, 3)} hero />
      </div>
      <div className="mt-10">
        <AssignmentDesk
          canAssign={canAssign}
          people={people.map((p) => ({ ...p, role: p.role as StaffRole }))}
          bookings={bookings}
          movements={movements}
          assignments={assignments.map((a) => ({
            ...a,
            kind: a.kind as AssignmentKindName,
            assignee: { ...a.assignee, role: a.assignee.role as StaffRole },
          }))}
        />
      </div>
    </div>
  );
}
