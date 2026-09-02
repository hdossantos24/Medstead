"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Input, Select } from "./ui";

type Pilot = { id: string; name: string };
type BookingOpt = { bookingCode: string };

export function AssignPilotForm({
  movementId,
  pilots,
  currentPilotId,
}: {
  movementId: string;
  pilots: Pilot[];
  currentPilotId: string | null;
}) {
  const router = useRouter();
  const [pilotId, setPilotId] = useState(currentPilotId || pilots[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch(`/api/ops/movements/${movementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedPilotId: pilotId || null }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error || "Could not assign");
          return;
        }
        router.refresh();
      }}
    >
      <Field label="Assign pilot">
        <Select value={pilotId} onChange={(e) => setPilotId(e.target.value)}>
          {pilots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={busy || !pilotId} variant="navy">
        {busy ? "Saving…" : "Assign"}
      </Button>
      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    </form>
  );
}

export function AttachBookingForm({
  movementId,
  bookings,
}: {
  movementId: string;
  bookings: BookingOpt[];
}) {
  const router = useRouter();
  const [bookingCode, setBookingCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (bookings.length === 0) return null;

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!bookingCode) return;
        setBusy(true);
        await fetch(`/api/ops/movements/${movementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingCode }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      <Field label="Attach booking">
        <Select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)}>
          <option value="">None</option>
          {bookings.map((b) => (
            <option key={b.bookingCode} value={b.bookingCode}>
              {b.bookingCode}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline" disabled={busy || !bookingCode}>
        Attach
      </Button>
    </form>
  );
}

export function CreateMovementForm({
  pilots,
  bookings,
}: {
  pilots: Pilot[];
  bookings: BookingOpt[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"CARGO" | "PASSENGER">("CARGO");
  const [originCode, setOriginCode] = useState("FLL");
  const [destCode, setDestCode] = useState("NAS");
  const [pilotId, setPilotId] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">New internal movement</p>
      <p className="mt-2 text-sm text-navy-800/65">Staff board only. Not a public charter desk.</p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const res = await fetch("/api/ops/movements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              originCode,
              destCode,
              assignedPilotId: pilotId || null,
              bookingCode: bookingCode || null,
              notes: notes || null,
              capacitySeats: kind === "PASSENGER" ? 6 : null,
            }),
          });
          const data = await res.json();
          setBusy(false);
          if (!res.ok) {
            setError(data.error || "Could not create");
            return;
          }
          setNotes("");
          router.refresh();
        }}
      >
        <Field label="Kind">
          <Select value={kind} onChange={(e) => setKind(e.target.value as "CARGO" | "PASSENGER")}>
            <option value="CARGO">Cargo</option>
            <option value="PASSENGER">Passenger</option>
          </Select>
        </Field>
        <Field label="Pilot (optional)">
          <Select value={pilotId} onChange={(e) => setPilotId(e.target.value)}>
            <option value="">Unassigned</option>
            {pilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Origin">
          <Input value={originCode} onChange={(e) => setOriginCode(e.target.value)} required />
        </Field>
        <Field label="Destination">
          <Input value={destCode} onChange={(e) => setDestCode(e.target.value)} required />
        </Field>
        <Field label="Attach booking (optional)">
          <Select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)}>
            <option value="">None</option>
            {bookings.map((b) => (
              <option key={b.bookingCode} value={b.bookingCode}>
                {b.bookingCode}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add to board"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
