import { OpsBookingCard } from "@/components/ops-desk";
import { actorAllows, requireStaffPage } from "@/lib/auth";
import { deskBookings } from "@/lib/desk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders & Packages" };

export default async function OpsOrdersPage({
  searchParams,
}: {
  searchParams: { lane?: string };
}) {
  const actor = await requireStaffPage(["ADMIN", "STAFF", "CARGO"]);
  const cargo = searchParams.lane === "cargo" || (actor.kind === "staff" && actor.user.role === "CARGO");
  const bookings = await deskBookings(actor, cargo ? "cargo" : null);
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
          : "Each card is a bookable package. Update tracking and issue invoice / pay later."}
      </p>
      <div className="mt-8 grid gap-4">
        {bookings.length === 0 && <p className="text-sm text-navy-800/65">Nothing in this queue.</p>}
        {bookings.map((b) => (
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
            }}
          />
        ))}
      </div>
    </div>
  );
}
