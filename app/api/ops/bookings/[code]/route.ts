import { NextRequest, NextResponse } from "next/server";
import { actorAllows, opsIdentity, requireOpsApi, type OpsActor } from "@/lib/auth";
import { BOOKING_STATUSES } from "@/lib/constants";
import {
  MARK_PAID_ELIGIBLE_INVOICE,
  buildMarkPaidAudit,
  issuePayLaterInvoice,
  markPayLater,
  trackingNoteForPayment,
  validateMarkPaidBody,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";

function paidByLabel(actor: OpsActor): string {
  if (actor.kind === "staff") {
    return actor.user.email || actor.user.name || "staff";
  }
  return opsIdentity() || "ops-desk";
}

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const gate = await requireOpsApi();
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const code = decodeURIComponent(params.code);
  const booking = await prisma.booking.findUnique({
    where: { bookingCode: code },
    include: { payments: { orderBy: { paidAt: "desc" }, take: 1 } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    status?: string;
    note?: string;
    action?: "issue_invoice" | "pay_later" | "mark_paid";
    amountUsd?: number;
    paymentMethod?: string;
    reference?: string;
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
    // Idempotent: already paid — return current state, do not invent a second payment.
    if (booking.invoiceStatus === "paid" || booking.paidAt) {
      const latest = booking.payments[0] || null;
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        payment: latest
          ? {
              paidAt: latest.paidAt,
              paidBy: latest.paidBy,
              paymentMethod: latest.paymentMethod,
              amountUsd: latest.amountUsd,
              reference: latest.reference,
              note: latest.note,
              priorInvoiceStatus: latest.priorInvoiceStatus,
              bookingStatusAfter: latest.bookingStatusAfter,
            }
          : {
              paidAt: booking.paidAt,
              paidBy: booking.paidBy,
              paymentMethod: booking.paymentMethod,
              amountUsd: booking.invoiceUsd ?? booking.estimateUsd,
              reference: booking.paymentReference,
              note: booking.paymentNote,
              priorInvoiceStatus: null,
              bookingStatusAfter: "PAID",
            },
      });
    }

    if (!MARK_PAID_ELIGIBLE_INVOICE.has(booking.invoiceStatus)) {
      return NextResponse.json(
        { error: "Mark paid is only available when an invoice is issued or marked pay later" },
        { status: 400 },
      );
    }

    const validated = validateMarkPaidBody({
      paymentMethod: body.paymentMethod,
      amountUsd: body.amountUsd ?? booking.invoiceUsd ?? booking.estimateUsd,
      reference: body.reference,
      note: body.note,
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const paidBy = paidByLabel(gate.actor);
    const audit = buildMarkPaidAudit({
      paymentMethod: validated.paymentMethod,
      amountUsd: validated.amountUsd,
      reference: validated.reference || undefined,
      note: validated.note || undefined,
      paidBy,
      priorInvoiceStatus: booking.invoiceStatus,
    });

    await prisma.$transaction([
      prisma.paymentRecord.create({
        data: {
          bookingId: booking.id,
          paidAt: audit.paidAt,
          paidBy: audit.paidBy,
          paymentMethod: audit.paymentMethod,
          amountUsd: audit.amountUsd,
          reference: audit.reference ?? null,
          note: audit.note ?? null,
          priorInvoiceStatus: audit.priorInvoiceStatus,
          bookingStatusAfter: audit.bookingStatusAfter,
        },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          invoiceStatus: audit.invoiceStatus,
          invoiceUsd: audit.amountUsd,
          invoiceRef: booking.invoiceRef || `INV-${booking.bookingCode}`,
          status: "PAID",
          paidAt: audit.paidAt,
          paidBy: audit.paidBy,
          paymentMethod: audit.paymentMethod,
          paymentReference: audit.reference ?? null,
          paymentNote: audit.note ?? null,
        },
      }),
      prisma.trackingEvent.create({
        data: {
          bookingId: booking.id,
          status: "PAID",
          note: trackingNoteForPayment(audit.paymentMethod, audit.amountUsd, audit.reference ?? null),
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      alreadyPaid: false,
      payment: {
        paidAt: audit.paidAt,
        paidBy: audit.paidBy,
        paymentMethod: audit.paymentMethod,
        amountUsd: audit.amountUsd,
        reference: audit.reference ?? null,
        note: audit.note ?? null,
        priorInvoiceStatus: audit.priorInvoiceStatus,
        bookingStatusAfter: audit.bookingStatusAfter,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
