"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaBadge } from "./fa-badge";
import { Button, Card, Field, Input, Select } from "./ui";

type Pilot = { id: string; name: string };
type BookingOpt = { bookingCode: string };
type AircraftOpt = { id: string; tailNumber: string; label: string | null };
type PassengerOpt = { id: string; name: string; email: string | null };
type StaffOpt = { id: string; name: string; role: string };

const STATUSES = ["REQUESTED", "SCHEDULED", "DISPATCHED", "COMPLETE", "HOLD"] as const;

export function SyncFlightAwareButton({
  movementId,
  configured,
}: {
  movementId?: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          const res = await fetch("/api/ops/flightaware/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(movementId ? { movementId } : {}),
          });
          const data = await res.json();
          setBusy(false);
          if (!res.ok) {
            setMsg(data.error || "Sync failed");
            return;
          }
          setMsg(
            data.configured
              ? movementId
                ? "Synced this flight"
                : `Synced ${data.synced || 0} flights`
              : "Monitor offline — add FLIGHTAWARE_API_KEY in Vercel",
          );
          router.refresh();
        }}
      >
        {busy ? "Syncing…" : movementId ? "Refresh FA" : "Sync all FA"}
      </Button>
      {!configured && (
        <span className="text-xs text-navy-800/55">FlightAware key not set (offline OK)</span>
      )}
      {msg && <span className="text-xs text-navy-800/70">{msg}</span>}
    </div>
  );
}

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
      <Field label="Attach freight booking">
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
        Attach cargo
      </Button>
    </form>
  );
}

export function AttachPassengerForm({
  movementId,
  passengers,
}: {
  movementId: string;
  passengers: PassengerOpt[];
}) {
  const router = useRouter();
  const [passengerId, setPassengerId] = useState("");
  const [busy, setBusy] = useState(false);

  if (passengers.length === 0) {
    return <p className="mt-2 text-xs text-navy-800/50">No unassigned passengers to attach.</p>;
  }

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!passengerId) return;
        setBusy(true);
        await fetch(`/api/ops/movements/${movementId}/passengers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passengerId }),
        });
        setBusy(false);
        setPassengerId("");
        router.refresh();
      }}
    >
      <Field label="Attach passenger">
        <Select value={passengerId} onChange={(e) => setPassengerId(e.target.value)}>
          <option value="">Select…</option>
          {passengers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.email ? ` · ${p.email}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline" disabled={busy || !passengerId}>
        Attach person
      </Button>
    </form>
  );
}

export function AssignStaffForm({
  movementId,
  staff,
}: {
  movementId: string;
  staff: StaffOpt[];
}) {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  if (staff.length === 0) return null;

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!staffId) return;
        setBusy(true);
        await fetch(`/api/ops/movements/${movementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffAssigneeId: staffId, staffTitle: title || null }),
        });
        setBusy(false);
        setStaffId("");
        setTitle("");
        router.refresh();
      }}
    >
      <Field label="Assign staff (next action)">
        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Select…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.role}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title (optional)">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Support trip" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" disabled={busy || !staffId}>
          Assign staff
        </Button>
      </div>
    </form>
  );
}

export function EditMovementForm({
  movementId,
  status,
  aircraftId,
  flightIdent,
  aircraft,
}: {
  movementId: string;
  status: string;
  aircraftId: string | null;
  flightIdent: string | null;
  aircraft: AircraftOpt[];
}) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [ac, setAc] = useState(aircraftId || "");
  const [ident, setIdent] = useState(flightIdent || "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await fetch(`/api/ops/movements/${movementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: st,
            aircraftId: ac || null,
            flightIdent: ident || null,
          }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      <Field label="Status">
        <Select value={st} onChange={(e) => setSt(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Aircraft">
        <Select value={ac} onChange={(e) => setAc(e.target.value)}>
          <option value="">Unassigned</option>
          {aircraft.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tailNumber}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="FA ident / tail">
        <Input
          value={ident}
          onChange={(e) => setIdent(e.target.value)}
          placeholder="N127TX or flight #"
        />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" variant="navy" disabled={busy}>
          {busy ? "Saving…" : "Save trip"}
        </Button>
      </div>
    </form>
  );
}

export function CreateMovementForm({
  pilots,
  bookings,
  aircraft,
  passengers,
}: {
  pilots: Pilot[];
  bookings: BookingOpt[];
  aircraft: AircraftOpt[];
  passengers: PassengerOpt[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"CARGO" | "PASSENGER">("CARGO");
  const [originCode, setOriginCode] = useState("FLL");
  const [destCode, setDestCode] = useState("NAS");
  const [pilotId, setPilotId] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [passengerId, setPassengerId] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [flightIdent, setFlightIdent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">New trip / movement</p>
      <p className="mt-2 text-sm text-navy-800/65">
        Internal staff board — link freight bookings and passengers to one flight. Not a public charter desk.
      </p>
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
              passengerIds: passengerId ? [passengerId] : [],
              aircraftId: aircraftId || null,
              flightIdent: flightIdent || (aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? null),
              scheduledAt: scheduledAt || null,
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
          setPassengerId("");
          setBookingCode("");
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
        <Field label="Aircraft">
          <Select value={aircraftId} onChange={(e) => setAircraftId(e.target.value)}>
            <option value="">Unassigned</option>
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tailNumber}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="FlightAware ident">
          <Input
            value={flightIdent}
            onChange={(e) => setFlightIdent(e.target.value)}
            placeholder="Defaults to tail"
          />
        </Field>
        <Field label="Scheduled (optional)">
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </Field>
        <Field label="Attach freight booking">
          <Select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)}>
            <option value="">None</option>
            {bookings.map((b) => (
              <option key={b.bookingCode} value={b.bookingCode}>
                {b.bookingCode}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Attach passenger">
          <Select value={passengerId} onChange={(e) => setPassengerId(e.target.value)}>
            <option value="">None</option>
            {passengers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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

export { FaBadge };
