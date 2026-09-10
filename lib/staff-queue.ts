import { ASSIGNMENT_KIND_LABEL, CARGO_LANE_STATUSES, type AssignmentKindName, type StaffRole } from "./staff";

export type QueueKind =
  | "confirm_booking"
  | "issue_invoice"
  | "mark_received"
  | "mark_in_transit"
  | "mark_customs"
  | "mark_ready_pickup"
  | "mark_delivered"
  | "open_assignment"
  | "acknowledge_brief";

export type QueueItem = {
  id: string;
  who: string;
  what: string;
  why: string;
  actionLabel: string;
  kind: QueueKind;
  href: string;
  bookingCode?: string;
  assignmentId?: string;
  movementCode?: string;
  status?: string;
};

type BookingRow = {
  bookingCode: string;
  contactName: string;
  destLabel: string;
  status: string;
  invoiceStatus: string;
  originMode?: string;
  cargoDescription?: string;
};

type AssignmentRow = {
  id: string;
  title: string;
  note: string | null;
  kind: string;
  status: string;
  assigneeId: string;
  booking?: { bookingCode: string; contactName: string } | null;
  movement?: { movementCode: string; originCode: string; destCode: string; kind: string } | null;
};

export function bookingNextKind(booking: Pick<BookingRow, "status" | "invoiceStatus">): QueueKind | null {
  if (booking.status === "REQUESTED") return "confirm_booking";
  if (booking.status === "CONFIRMED") return "issue_invoice";
  if (booking.status === "INVOICE_ISSUED" && booking.invoiceStatus !== "paid") return "issue_invoice";
  if (booking.status === "PAID" || (booking.status === "INVOICE_ISSUED" && booking.invoiceStatus === "paid")) {
    return "mark_received";
  }
  if (booking.status === "RECEIVED") return "mark_in_transit";
  if (booking.status === "IN_TRANSIT") return "mark_customs";
  if (booking.status === "CUSTOMS") return "mark_ready_pickup";
  if (booking.status === "READY_PICKUP") return "mark_delivered";
  return null;
}

export function bookingActionLabel(kind: QueueKind) {
  return {
    confirm_booking: "Confirm booking",
    issue_invoice: "Issue invoice",
    mark_received: "Mark received at warehouse",
    mark_in_transit: "Mark in transit",
    mark_customs: "Mark customs",
    mark_ready_pickup: "Ready for pickup",
    mark_delivered: "Mark delivered",
    open_assignment: "Open record",
    acknowledge_brief: "Acknowledge brief",
  }[kind];
}

export function bookingPatchForKind(kind: QueueKind): { status?: string; action?: "issue_invoice" } | null {
  if (kind === "confirm_booking") return { status: "CONFIRMED" };
  if (kind === "issue_invoice") return { action: "issue_invoice" };
  if (kind === "mark_received") return { status: "RECEIVED" };
  if (kind === "mark_in_transit") return { status: "IN_TRANSIT" };
  if (kind === "mark_customs") return { status: "CUSTOMS" };
  if (kind === "mark_ready_pickup") return { status: "READY_PICKUP" };
  if (kind === "mark_delivered") return { status: "DELIVERED" };
  return null;
}

export function inCargoLane(booking: Pick<BookingRow, "status" | "originMode">) {
  return (
    booking.originMode === "WAREHOUSE" ||
    (CARGO_LANE_STATUSES as readonly string[]).includes(booking.status)
  );
}

export function queueFromDesk(opts: {
  role: StaffRole | "PIN";
  userId?: string;
  bookings: BookingRow[];
  assignments: AssignmentRow[];
}): QueueItem[] {
  const items: QueueItem[] = [];
  const role = opts.role;
  const seeBookings = role === "ADMIN" || role === "STAFF" || role === "CARGO" || role === "PIN";
  const seeTrips = role === "ADMIN" || role === "PILOT";

  for (const a of opts.assignments) {
    if (a.status !== "OPEN") continue;
    if (role === "PILOT" && a.kind !== "FLIGHT_TRIP") continue;
    if (role !== "ADMIN" && role !== "PIN" && opts.userId && a.assigneeId !== opts.userId) continue;
    if (role === "PIN") continue;
    const trip = a.movement;
    const isTrip = a.kind === "FLIGHT_TRIP";
    if (isTrip && !seeTrips) continue;
    items.push({
      id: `asg-${a.id}`,
      who: trip ? `${trip.originCode} → ${trip.destCode}` : a.booking?.contactName || "Assigned work",
      what: a.title,
      why:
        a.note ||
        (trip
          ? `${trip.kind === "PASSENGER" ? "Passenger" : "Cargo"} movement ${trip.movementCode}. Acknowledge in-app.`
          : `${ASSIGNMENT_KIND_LABEL[a.kind as AssignmentKindName] || "Next action"}${
              a.booking ? ` · ${a.booking.bookingCode}` : ""
            }`),
      actionLabel: isTrip ? "Acknowledge brief" : "Mark done",
      kind: isTrip ? "acknowledge_brief" : "open_assignment",
      href: isTrip ? "/ops/trips" : a.booking ? `/ops/orders#${a.booking.bookingCode}` : "/ops/assignments",
      assignmentId: a.id,
      bookingCode: a.booking?.bookingCode,
      movementCode: trip?.movementCode,
    });
  }

  if (seeBookings) {
    for (const b of opts.bookings) {
      if (role === "CARGO" && !inCargoLane(b)) continue;
      const kind = bookingNextKind(b);
      if (!kind) continue;
      items.push({
        id: `bk-${b.bookingCode}-${kind}`,
        who: b.contactName,
        what: `${bookingActionLabel(kind)} · ${b.bookingCode}`,
        why: `${b.destLabel}${b.cargoDescription ? ` · ${b.cargoDescription}` : ""}`,
        actionLabel: bookingActionLabel(kind),
        kind,
        href: `/ops/orders#${b.bookingCode}`,
        bookingCode: b.bookingCode,
        status: b.status,
      });
    }
  }

  if (role === "PILOT" && items.length === 0) {
    items.push({
      id: "pilot-clear",
      who: "MTG Airways",
      what: "No trip brief waiting",
      why: "When ops assigns a cargo or passenger movement, the brief lands here. This is not a public charter desk.",
      actionLabel: "Open board",
      kind: "open_assignment",
      href: "/ops/trips",
    });
  }

  return items;
}
