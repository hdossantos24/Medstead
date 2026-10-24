import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { CONTACT_ORDERS, SERVICE_LABEL, SERVICE_WINDOW, STATUS_LABEL } from "@/lib/constants";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking confirmation" };

export default async function ConfirmPage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = decodeURIComponent(params.code);
  const booking = await prisma.booking.findUnique({ where: { bookingCode: code } });

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Booking not found</h1>
        <p className="mt-3 text-navy-800/70">Check the confirmation ID or start a new request.</p>
        <Button href="/book" className="mt-6">
          Book a shipment
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Confirmed request</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-navy-950">You&apos;re booked.</h1>
      <p className="mt-4 text-navy-800/70">
        No card was charged. MedStead will email an invoice to {booking.contactEmail}. Pay later is
        fine — ops closes the booking when payment is received.
      </p>

      <Card className="mt-8 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Booking ID</p>
        <p className="mt-2 font-mono text-xl font-semibold text-navy-950">{booking.bookingCode}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-navy-800/50">Status</dt>
            <dd className="font-medium">{STATUS_LABEL[booking.status]}</dd>
          </div>
          <div>
            <dt className="text-navy-800/50">Service</dt>
            <dd className="font-medium">
              {SERVICE_LABEL[booking.service]} · {SERVICE_WINDOW[booking.service]}
            </dd>
          </div>
          <div>
            <dt className="text-navy-800/50">From</dt>
            <dd className="font-medium">{booking.originLabel}</dd>
          </div>
          <div>
            <dt className="text-navy-800/50">To</dt>
            <dd className="font-medium">{booking.destLabel}</dd>
          </div>
          <div>
            <dt className="text-navy-800/50">Cargo</dt>
            <dd className="font-medium">
              {booking.weightLb} lb · {booking.pieces} pcs
            </dd>
          </div>
          <div>
            <dt className="text-navy-800/50">Estimate</dt>
            <dd className="font-medium">{money(booking.estimateUsd)} (not a charge)</dd>
          </div>
        </dl>
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={`/track/${booking.bookingCode}`} variant="blue">
          Track this shipment
        </Button>
        <Button href="/account" variant="outline">
          Save to account
        </Button>
        <Link href={`mailto:${CONTACT_ORDERS}`} className="inline-flex min-h-tap items-center text-sm font-semibold text-navy-800">
          {CONTACT_ORDERS}
        </Link>
      </div>
    </div>
  );
}
