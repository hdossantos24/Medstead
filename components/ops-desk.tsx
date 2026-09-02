"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOKING_STATUSES, INVOICE_STATUS_LABEL, STATUS_LABEL } from "@/lib/constants";
import { money } from "@/lib/money";
import { Button, Field, Input, Select } from "./ui";

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
};

export function OpsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

  async function staffSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/ops/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Those credentials do not match.");
      return;
    }
    router.push(data.home || "/ops");
    router.refresh();
  }

  async function pinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
  }

  return (
    <div className="grid gap-6">
      <form className="grid max-w-sm gap-3" onSubmit={staffSubmit}>
        <Field label="Work email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {error && !showPin && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit">Open ops desk</Button>
      </form>

      <div>
        <button
          type="button"
          className="text-sm font-semibold text-navy-800/70 underline"
          onClick={() => setShowPin((v) => !v)}
        >
          {showPin ? "Hide break-glass PIN" : "Break-glass PIN"}
        </button>
        {showPin && (
          <form className="mt-3 grid max-w-sm gap-3" onSubmit={pinSubmit}>
            <Field label="Ops PIN" hint="Emergency desk only. Day-to-day staff use their own login.">
              <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" variant="outline">
              Open with PIN
            </Button>
          </form>
        )}
      </div>
    </div>
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
        router.push("/ops");
        router.refresh();
      }}
    >
      Sign out of ops
    </Button>
  );
}

export function OpsBookingCard({
  booking,
  canTrack = true,
  canInvoice = true,
}: {
  booking: BookingRow;
  canTrack?: boolean;
  canInvoice?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(String(booking.invoiceUsd ?? booking.estimateUsd));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
    setMessage("Saved");
    router.refresh();
  }

  return (
    <article id={booking.bookingCode} className="rounded-2xl border border-navy-900/8 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">{booking.bookingCode}</p>
          <p className="text-sm text-navy-800/60">
            {booking.contactName} · {booking.contactEmail} · {booking.destLabel}
          </p>
        </div>
        <p className="text-sm text-navy-800/70">
          Est. {money(booking.estimateUsd)} · {INVOICE_STATUS_LABEL[booking.invoiceStatus]}
        </p>
      </div>

      {canTrack && (
        <>
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
        </>
      )}

      {canInvoice && (
        <>
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
            <Button type="button" variant="navy" disabled={busy} onClick={() => patch({ action: "mark_paid" })}>
              Mark paid (offline)
            </Button>
          </div>
        </>
      )}
      {message && <p className="mt-3 text-sm text-forest-700">{message}</p>}
    </article>
  );
}
