"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BOOKING_STATUSES, INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL, STATUS_LABEL } from "@/lib/constants";
import { money } from "@/lib/money";
import { Button, Field, Input, Select, Textarea } from "./ui";

type BookingRow = {
  bookingCode: string;
  contactName: string;
  contactEmail: string;
  destLabel: string;
  service: string;
  status: string;
  estimateUsd: number;
  invoiceUsd: number | null;
  invoiceStatus: string;
  invoiceRef: string | null;
  paidAt: string | null;
  paidBy: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentNote: string | null;
};

function isUnpaidInvoiced(b: Pick<BookingRow, "invoiceStatus">) {
  return b.invoiceStatus === "issued" || b.invoiceStatus === "pay_later";
}

function isPaid(b: Pick<BookingRow, "invoiceStatus" | "paidAt">) {
  return b.invoiceStatus === "paid" || Boolean(b.paidAt);
}

export function OpsLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="grid max-w-sm gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/ops/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (!res.ok) {
          setError("PIN not accepted");
          return;
        }
        router.refresh();
      }}
    >
      <Field label="Ops PIN">
        <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit">Open ops desk</Button>
    </form>
  );
}

export function OpsLogout() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await fetch("/api/ops/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out of ops
    </Button>
  );
}

export function OpsQueueFilter({
  value,
  unpaidCount,
}: {
  value: "all" | "unpaid";
  unpaidCount: number;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-navy-800/55">Queue</span>
      <Button
        type="button"
        variant={value === "all" ? "navy" : "outline"}
        className="!min-h-0 !px-3 !py-1.5 text-xs"
        onClick={() => router.push("/ops")}
      >
        All recent
      </Button>
      <Button
        type="button"
        variant={value === "unpaid" ? "navy" : "outline"}
        className="!min-h-0 !px-3 !py-1.5 text-xs"
        onClick={() => router.push("/ops?queue=unpaid")}
      >
        Unpaid invoiced ({unpaidCount})
      </Button>
    </div>
  );
}

export function OpsBookingCard({ booking }: { booking: BookingRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(String(booking.invoiceUsd ?? booking.estimateUsd));
  const [paymentMethod, setPaymentMethod] = useState<"wire" | "cash">("wire");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const paid = isPaid(booking);
  const canMarkPaid = isUnpaidInvoiced(booking) && !paid;

  const paidSummary = useMemo(() => {
    if (!paid) return null;
    const when = booking.paidAt ? new Date(booking.paidAt).toLocaleString() : "—";
    const method = booking.paymentMethod
      ? PAYMENT_METHOD_LABEL[booking.paymentMethod] || booking.paymentMethod
      : "offline";
    return { when, method };
  }, [paid, booking.paidAt, booking.paymentMethod]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/ops/bookings/${encodeURIComponent(booking.bookingCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Update failed");
      return;
    }
    if (data.alreadyPaid) {
      setMessage("Already marked paid — no second payment recorded.");
    } else {
      setMessage("Saved");
    }
    router.refresh();
  }

  return (
    <article className="rounded-2xl border border-navy-900/8 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">{booking.bookingCode}</p>
          <p className="text-sm text-navy-800/60">
            {booking.contactName} · {booking.contactEmail} · {booking.destLabel}
          </p>
        </div>
        <p className="text-sm text-navy-800/70">
          Est. {money(booking.estimateUsd)} · {INVOICE_STATUS_LABEL[booking.invoiceStatus] || booking.invoiceStatus}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tracking note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional public note" />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => patch({ status, note })}>
          Update tracking
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Invoice amount (USD)">
          <Input type="number" min={1} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <p className="self-end text-xs text-navy-800/55">
          {booking.invoiceRef ? `Ref ${booking.invoiceRef}` : "No invoice yet"}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="blue"
          disabled={busy}
          onClick={() => patch({ action: "issue_invoice", amountUsd: Number(amount) })}
        >
          Issue invoice
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => patch({ action: "pay_later" })}>
          Mark pay later
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-navy-900/10 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-navy-950">Mark paid (wire / cash)</p>
        <p className="mt-1 text-xs text-navy-800/55">
          Confirm funds received offline. Reference only — never enter bank account or card numbers. Card
          checkout is not live in this app.
        </p>

        {paid && paidSummary ? (
          <div className="mt-3 space-y-1 text-sm text-forest-800">
            <p className="font-medium">Already paid</p>
            <p>
              {paidSummary.method}
              {booking.invoiceUsd != null ? ` · ${money(booking.invoiceUsd)}` : ""}
              {booking.paymentReference ? ` · ref ${booking.paymentReference}` : ""}
            </p>
            <p className="text-xs text-navy-800/60">
              Confirmed {paidSummary.when}
              {booking.paidBy ? ` by ${booking.paidBy}` : ""}
            </p>
            {booking.paymentNote && <p className="text-xs text-navy-800/55">Note: {booking.paymentNote}</p>}
          </div>
        ) : canMarkPaid ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Method">
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "wire" | "cash")}
                >
                  <option value="wire">Wire transfer</option>
                  <option value="cash">Cash</option>
                </Select>
              </Field>
              <Field label="Amount confirmed (USD)">
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field
                label={paymentMethod === "wire" ? "Wire confirmation / txn id" : "Cash receipt # (optional)"}
                hint="Short reference only — no full account numbers"
              >
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={paymentMethod === "wire" ? "Required for wire" : "Optional"}
                  required={paymentMethod === "wire"}
                />
              </Field>
              <Field label="Staff note (optional)">
                <Textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Optional — no PANs or full statements"
                  rows={2}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                variant="navy"
                disabled={busy}
                onClick={() =>
                  patch({
                    action: "mark_paid",
                    paymentMethod,
                    amountUsd: Number(amount),
                    reference: paymentReference,
                    note: paymentNote,
                  })
                }
              >
                Mark paid
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-navy-800/60">
            Issue an invoice (or mark pay later) before confirming wire/cash payment.
          </p>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-forest-700">{message}</p>}
    </article>
  );
}
