import { OpsBookingCard, OpsQueueFilter } from "@/components/ops-desk";
import { actorAllows, requireStaffPage } from "@/lib/auth";
import { deskBookings } from "@/lib/desk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders & Packages" };

export default async function OpsOrdersPage({
  searchParams,
}: {
  searchParams: { lane?: string; queue?: string };
}) {
  const actor = await requireStaffPage(["ADMIN", "STAFF", "CARGO"]);
  const cargo = searchParams.lane === "cargo" || (actor.kind === "staff" && actor.user.role === "CARGO");
  const queue = searchParams.queue === "unpaid" ? "unpaid" : "all";
  const bookings = await deskBookings(actor, cargo ? "cargo" : null);
  const unpaidWhere = {
    invoiceStatus: { in: ["issued", "pay_later"] as string[] },
    paidAt: null,
  };
  const unpaidCount = await prisma.booking.count({ where: unpaidWhere });
  const shown =
    queue === "unpaid"
      ? bookings.filter((b) => (b.invoiceStatus === "issued" || b.invoiceStatus === "pay_later") && !b.paidAt)
      : bookings;
  const canTrack = await actorAllows(actor, "update_tracking");
  const canInvoice = await actorAllows(actor, "issue_invoice");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">
        {cargo ? "Warehouse" : "Orders & Packages"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">{cargo ? "Cargo queue" : "Orders & Packages"}</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        {cargo
          ? "Warehouse-style bookings: paid, received, in transit, customs, ready for pickup."
          : "Each card is a bookable package. Update tracking, issue invoice / pay later, and mark wire/cash paid."}
      </p>
      {!cargo && (
        <div className="mt-6">
          <OpsQueueFilter value={queue} unpaidCount={unpaidCount} />
        </div>
      )}
      <div className="mt-8 grid gap-4">
        {shown.length === 0 && (
          <p className="text-sm text-navy-800/65">
            {queue === "unpaid" ? "No unpaid invoiced bookings right now." : "Nothing in this queue."}
          </p>
        )}
        {shown.map((b) => (
          <OpsBookingCard
            key={b.id}
            canTrack={canTrack}
            canInvoice={canInvoice}
            booking={{
              bookingCode: b.bookingCode,
              contactName: b.contactName,
              contactEmail: b.contactEmail,
              destLabel: b.destLabel,
              service: b.service,
              status: b.status,
              estimateUsd: b.estimateUsd,
              invoiceUsd: b.invoiceUsd,
              invoiceStatus: b.invoiceStatus,
              invoiceRef: b.invoiceRef,
              paidAt: b.paidAt ? b.paidAt.toISOString() : null,
              paidBy: b.paidBy,
              paymentMethod: b.paymentMethod,
              paymentReference: b.paymentReference,
              paymentNote: b.paymentNote,
            }}
          />
        ))}
      </div>
    </div>
  );
}
