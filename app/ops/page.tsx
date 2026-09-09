import { OpsBookingCard, OpsLogin, OpsLogout, OpsQueueFilter } from "@/components/ops-desk";
import { isOps } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops desk" };

type SearchParams = { queue?: string };

export default async function OpsPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!isOps()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Internal</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">Ops desk</h1>
        <p className="mt-3 text-sm text-navy-800/70">
          Update tracking, issue invoices, and mark wire/cash paid. This is not a customer page.
        </p>
        <div className="mt-6">
          <OpsLogin />
        </div>
      </div>
    );
  }

  const queue = searchParams?.queue === "unpaid" ? "unpaid" : "all";

  const unpaidWhere = {
    invoiceStatus: { in: ["issued", "pay_later"] },
    paidAt: null,
  };

  const [bookings, unpaidCount] = await Promise.all([
    prisma.booking.findMany({
      where: queue === "unpaid" ? unpaidWhere : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.booking.count({ where: unpaidWhere }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Internal</p>
          <h1 className="mt-3 text-3xl font-semibold text-navy-950">Ops desk</h1>
          <p className="mt-2 text-sm text-navy-800/70">
            Simulated tracking is OK in v1. Invoice / pay later + ops mark-paid (wire/cash). No card rail
            is live.
          </p>
        </div>
        <OpsLogout />
      </div>

      <div className="mt-6">
        <OpsQueueFilter value={queue} unpaidCount={unpaidCount} />
      </div>

      <div className="mt-8 grid gap-4">
        {bookings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-navy-900/15 bg-white p-6 text-sm text-navy-800/60">
            {queue === "unpaid"
              ? "No unpaid invoiced bookings right now."
              : "No bookings yet."}
          </p>
        )}
        {bookings.map((b) => (
          <OpsBookingCard
            key={b.id}
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
