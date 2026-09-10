import type { OpsActor } from "./auth";
import { prisma } from "./prisma";
import type { StaffRole } from "./staff";
import { inCargoLane, queueFromDesk, type QueueItem } from "./staff-queue";

export async function loadDeskQueue(actor: OpsActor): Promise<QueueItem[]> {
  const role = actor.kind === "pin" ? "PIN" : (actor.user.role as StaffRole);
  const [bookings, assignments] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        bookingCode: true,
        contactName: true,
        destLabel: true,
        status: true,
        invoiceStatus: true,
        originMode: true,
        cargoDescription: true,
      },
    }),
    prisma.workAssignment.findMany({
      where: actor.kind === "staff" && actor.user.role !== "ADMIN" ? { assigneeId: actor.user.id, status: "OPEN" } : { status: "OPEN" },
      include: {
        booking: { select: { bookingCode: true, contactName: true } },
        movement: { select: { movementCode: true, originCode: true, destCode: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return queueFromDesk({
    role,
    userId: actor.kind === "staff" ? actor.user.id : undefined,
    bookings,
    assignments,
  });
}

export async function deskBookings(actor: OpsActor, lane?: string | null) {
  const rows = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (lane === "cargo" || (actor.kind === "staff" && actor.user.role === "CARGO")) {
    return rows.filter((b) => inCargoLane(b));
  }
  return rows;
}

export async function staffDirectory() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF", "PILOT", "CARGO"] }, active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

