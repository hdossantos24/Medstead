import { TrackForm } from "@/components/track-form";
import { Badge, Card } from "@/components/ui";
import {
  BOOKING_STATUSES,
  CONTACT_ORDERS,
  INVOICE_STATUS_LABEL,
  SERVICE_LABEL,
  SERVICE_WINDOW,
  STATUS_LABEL,
} from "@/lib/constants";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shipment tracking" };

export default async function TrackDetailPage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = decodeURIComponent(params.code);
  const booking = await prisma.booking.findUnique({
    where: { bookingCode: code },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Tracking</p>
      <h1 className="mt-3 font-mono text-2xl font-semibold text-navy-950 sm:text-3xl">{code}</h1>
      <div className="mt-6 max-w-xl">
        <TrackForm initial={code} />
      </div>

      {!booking ? (
        <Card className="mt-8 p-6">
          <p className="font-semibold text-navy-950">No shipment with that ID</p>
          <p className="mt-2 text-sm text-navy-800/65">
            Check the format MS-YYYYMMDD-ORIGIN-DEST-#### or email {CONTACT_ORDERS}.
          </p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{STATUS_LABEL[booking.status]}</Badge>
              <Badge tone="blue">{SERVICE_LABEL[booking.service]}</Badge>
            </div>
            <ol className="mt-8 space-y-3">
              {BOOKING_STATUSES.map((status, i) => {
                const current = BOOKING_STATUSES.indexOf(booking.status as (typeof BOOKING_STATUSES)[number]);
                const done = current >= 0 && i <= current;
                return (
                  <li key={status} className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${done ? "bg-brand-green" : "bg-navy-900/15"}`} />
                    <p className={`text-sm font-semibold ${done ? "text-navy-950" : "text-navy-800/35"}`}>
                      {STATUS_LABEL[status]}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Movement</p>
            <p className="mt-2 text-lg font-semibold">
              {booking.originLabel} → {booking.destLabel}
            </p>
            <p className="mt-2 text-sm text-navy-800/60">{SERVICE_WINDOW[booking.service]}</p>
            <p className="mt-4 text-sm">
              {booking.weightLb} lb · {booking.pieces} pcs
            </p>
            <p className="mt-2 text-sm text-navy-800/70">{booking.cargoDescription}</p>
            <p className="mt-4 text-sm">
              Invoice: {INVOICE_STATUS_LABEL[booking.invoiceStatus]}
              {booking.invoiceUsd ? ` · ${money(booking.invoiceUsd)}` : ""}
            </p>
            <p className="mt-4 text-xs leading-5 text-navy-800/50">
              MedStead is not a licensed customs broker. Duties stay with the importer of record.
            </p>
            <ul className="mt-6 space-y-2 text-xs text-navy-800/60">
              {booking.events.map((e) => (
                <li key={e.id}>
                  {e.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} — {e.note}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
