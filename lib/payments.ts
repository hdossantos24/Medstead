/**
 * Payment rail for v1: invoice + pay later + ops mark-paid (wire/cash).
 *
 * A card processor (Stripe, etc.) is intentionally not wired.
 * Do not invent API keys. When a live rail is ready:
 *   1. Add processor secrets to the host env (never commit them).
 *   2. Implement checkout + webhook; set paymentProvider accordingly.
 *   3. Keep invoice_pay_later as the default so ops can still close bookings offline.
 */

export type PaymentProvider = "invoice_pay_later";

export type ManualPaymentMethod = "wire" | "cash";

export type InvoiceRecord = {
  provider: PaymentProvider;
  status: "issued" | "pay_later" | "paid";
  reference: string;
  amountUsd: number;
  checkoutUrl: null;
  note: string;
};

export type MarkPaidInput = {
  paymentMethod: ManualPaymentMethod;
  amountUsd: number;
  reference?: string;
  note?: string;
  paidBy: string;
  priorInvoiceStatus: string;
};

export type MarkPaidAudit = MarkPaidInput & {
  paidAt: Date;
  bookingStatusAfter: "PAID";
  invoiceStatus: "paid";
};

export const MANUAL_PAYMENT_METHODS: ManualPaymentMethod[] = ["wire", "cash"];

/** Invoice states where staff may confirm wire/cash receipt. */
export const MARK_PAID_ELIGIBLE_INVOICE = new Set(["issued", "pay_later"]);

export function issuePayLaterInvoice(bookingCode: string, amountUsd: number): InvoiceRecord {
  return {
    provider: "invoice_pay_later",
    status: "issued",
    reference: `INV-${bookingCode}`,
    amountUsd,
    checkoutUrl: null,
    note: "Invoice issued. Pay later — no card is charged in this app.",
  };
}

export function markPayLater(invoice: InvoiceRecord): InvoiceRecord {
  return { ...invoice, status: "pay_later" };
}

export function markPaidInvoice(invoice: InvoiceRecord): InvoiceRecord {
  return { ...invoice, status: "paid" };
}

/** @deprecated use markPaidInvoice — kept for any older imports */
export const markPaid = markPaidInvoice;

export function buildMarkPaidAudit(input: MarkPaidInput): MarkPaidAudit {
  return {
    ...input,
    paidAt: new Date(),
    bookingStatusAfter: "PAID",
    invoiceStatus: "paid",
  };
}

export function validateMarkPaidBody(body: {
  paymentMethod?: string;
  amountUsd?: number;
  reference?: string;
  note?: string;
}): { ok: true; paymentMethod: ManualPaymentMethod; amountUsd: number; reference: string | null; note: string | null } | { ok: false; error: string } {
  const method = body.paymentMethod;
  if (method !== "wire" && method !== "cash") {
    return { ok: false, error: "Choose payment method: wire or cash" };
  }
  const amount = Number(body.amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a confirmed amount (USD)" };
  }
  const reference = (body.reference || "").trim();
  if (method === "wire" && !reference) {
    return { ok: false, error: "Wire confirmation / bank txn id is required" };
  }
  const note = (body.note || "").trim();
  // Never accept anything that looks like a full PAN or long account dump
  const sensitive = /\b(?:\d[ -]*?){13,19}\b/;
  if (sensitive.test(reference) || sensitive.test(note)) {
    return { ok: false, error: "Do not enter full account or card numbers — reference only" };
  }
  return {
    ok: true,
    paymentMethod: method,
    amountUsd: Math.round(amount * 100) / 100,
    reference: reference || null,
    note: note || null,
  };
}

export function trackingNoteForPayment(method: ManualPaymentMethod, amountUsd: number, reference: string | null): string {
  const refBit = reference ? ` Ref ${reference}.` : "";
  return `Payment received (${method}) — $${amountUsd.toFixed(2)} USD.${refBit} No card was charged in this app.`;
}
