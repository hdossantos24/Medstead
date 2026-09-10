"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSIGNMENT_KIND_LABEL, ROLE_LABEL, type AssignmentKindName, type StaffRole } from "@/lib/staff";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "./ui";

type Person = { id: string; name: string; email: string; role: StaffRole };
type Row = {
  id: string;
  title: string;
  note: string | null;
  kind: AssignmentKindName;
  status: "OPEN" | "DONE";
  assignee: { id: string; name: string; role: StaffRole };
  booking: { bookingCode: string; contactName: string } | null;
  movement: { movementCode: string; originCode: string; destCode: string; kind: string } | null;
};

export function AssignmentDesk({
  people,
  bookings,
  movements,
  assignments,
  canAssign,
}: {
  people: Person[];
  bookings: { bookingCode: string }[];
  movements: { movementCode: string; originCode: string; destCode: string }[];
  assignments: Row[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<AssignmentKindName>("NEXT_ACTION");
  const [assigneeId, setAssigneeId] = useState(people[0]?.id || "");
  const [bookingCode, setBookingCode] = useState("");
  const [movementCode, setMovementCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/ops/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, note, kind, assigneeId, bookingCode, movementCode }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not assign");
      return;
    }
    setTitle("");
    setNote("");
    router.refresh();
  }

  async function close(id: string) {
    await fetch(`/api/ops/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      {canAssign && (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Assign work</p>
          <form className="mt-4 grid gap-3" onSubmit={create}>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Note">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kind">
                <Select value={kind} onChange={(e) => setKind(e.target.value as AssignmentKindName)}>
                  {Object.entries(ASSIGNMENT_KIND_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assignee">
                <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {ROLE_LABEL[p.role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Booking (optional)">
                <Select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)}>
                  <option value="">None</option>
                  {bookings.map((b) => (
                    <option key={b.bookingCode} value={b.bookingCode}>
                      {b.bookingCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Movement (optional)">
                <Select value={movementCode} onChange={(e) => setMovementCode(e.target.value)}>
                  <option value="">None</option>
                  {movements.map((m) => (
                    <option key={m.movementCode} value={m.movementCode}>
                      {m.movementCode} · {m.originCode}→{m.destCode}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy || !assigneeId}>
              {busy ? "Saving…" : "Assign"}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {assignments.length === 0 && <p className="text-sm text-navy-800/65">No assignments yet.</p>}
        {assignments.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-950">{a.title}</p>
                <p className="text-sm text-navy-800/60">
                  {a.assignee.name} · {ASSIGNMENT_KIND_LABEL[a.kind]}
                  {a.booking ? ` · ${a.booking.bookingCode}` : ""}
                  {a.movement ? ` · ${a.movement.movementCode}` : ""}
                </p>
                {a.note && <p className="mt-2 text-sm text-navy-800/70">{a.note}</p>}
              </div>
              <Badge tone={a.status === "DONE" ? "green" : "amber"}>{a.status === "DONE" ? "Done" : "Open"}</Badge>
            </div>
            {a.status === "OPEN" && (
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={() => close(a.id)}>
                  Mark done
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
