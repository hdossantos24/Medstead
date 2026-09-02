import { NextRequest, NextResponse } from "next/server";
import { actorAllows, requireOpsApi } from "@/lib/auth";
import { BOOKING_STATUSES } from "@/lib/constants";
import { issuePayLaterInvoice, markPaid, markPayLater } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const gate = await requireOpsApi();
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const code = decodeURIComponent(params.code);
  const booking = await prisma.booking.findUnique({ where: { bookingCode: code } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    status?: string;
    note?: string;
    action?: "issue_invoice" | "pay_later" | "mark_paid";
    amountUsd?: number;
  };

  if (body.status || body.note) {
    if (!(await actorAllows(gate.actor, "update_tracking"))) {
      return NextResponse.json({ error: "That seat cannot update tracking." }, { status: 403 });
    }
  }
  if (body.action && !(await actorAllows(gate.actor, "issue_invoice"))) {
    return NextResponse.json({ error: "That seat cannot issue invoice / pay later." }, { status: 403 });
  }

  if (body.status) {
    if (!BOOKING_STATUSES.includes(body.status as (typeof BOOKING_STATUSES)[number])) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: body.status },
    });
    await prisma.trackingEvent.create({
      data: {
        bookingId: booking.id,
        status: body.status,
        note: body.note?.trim() || `Status updated to ${body.status}.`,
      },
    });
  }

  if (body.action === "issue_invoice") {
    const amount = Number(body.amountUsd ?? booking.invoiceUsd ?? booking.estimateUsd);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Enter an invoice amount" }, { status: 400 });
    }
    const invoice = issuePayLaterInvoice(booking.bookingCode, amount);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        invoiceUsd: invoice.amountUsd,
        invoiceStatus: invoice.status,
        invoiceRef: invoice.reference,
        paymentProvider: invoice.provider,
        status: booking.status === "REQUESTED" || booking.status === "CONFIRMED" ? "INVOICE_ISSUED" : booking.status,
      },
    });
    await prisma.trackingEvent.create({
      data: {
        bookingId: booking.id,
        status: "INVOICE_ISSUED",
        note: invoice.note,
      },
    });
  }

  if (body.action === "pay_later" && booking.invoiceRef && booking.invoiceUsd) {
    const invoice = markPayLater({
      provider: "invoice_pay_later",
      status: "issued",
      reference: booking.invoiceRef,
      amountUsd: booking.invoiceUsd,
      checkoutUrl: null,
      note: "",
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { invoiceStatus: invoice.status },
    });
  }

  if (body.action === "mark_paid") {
    const invoice = markPaid({
      provider: "invoice_pay_later",
      status: booking.invoiceStatus === "pay_later" ? "pay_later" : "issued",
      reference: booking.invoiceRef || `INV-${booking.bookingCode}`,
      amountUsd: booking.invoiceUsd || booking.estimateUsd,
      checkoutUrl: null,
      note: "",
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        invoiceStatus: invoice.status,
        invoiceRef: invoice.reference,
        invoiceUsd: invoice.amountUsd,
        status: booking.status === "INVOICE_ISSUED" || booking.status === "CONFIRMED" ? "PAID" : booking.status,
      },
    });
    await prisma.trackingEvent.create({
      data: {
        bookingId: booking.id,
        status: "PAID",
        note: "Payment received offline. No card was charged in this app.",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
