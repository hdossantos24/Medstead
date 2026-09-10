"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, Field, Input } from "./ui";

export type PassengerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  weightLbs: number | null;
  responseStatus: string | null;
  movement: {
    id: string;
    movementCode: string;
    originCode: string;
    destCode: string;
    status: string;
    faStatus: string | null;
  } | null;
};

export function PassengerDesk({ passengers }: { passengers: PassengerRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return passengers;
    return passengers.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.phone || "").toLowerCase().includes(s) ||
        (p.movement?.movementCode || "").toLowerCase().includes(s),
    );
  }, [passengers, q]);

  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <Field label="Search passengers">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, phone, or trip code"
          />
        </Field>
        <p className="mt-2 text-xs text-navy-800/55">{filtered.length} of {passengers.length}</p>
      </Card>

      {filtered.length === 0 && (
        <Card className="p-6">
          <p className="font-semibold text-navy-950">No passengers match</p>
          <p className="mt-2 text-sm text-navy-800/65">
            Import Bolt passenger CSVs via the flight-ops import script, or attach people from the trips desk.
          </p>
        </Card>
      )}

      {filtered.map((p) => (
        <Card key={p.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-950">{p.name}</p>
              <p className="text-sm text-navy-800/60">
                {[p.email, p.phone].filter(Boolean).join(" · ") || "No contact on file"}
              </p>
              {p.weightLbs != null && (
                <p className="mt-1 text-xs text-navy-800/50">{p.weightLbs} lb</p>
              )}
            </div>
            {p.responseStatus && <Badge tone="navy">{p.responseStatus}</Badge>}
          </div>
          {p.movement ? (
            <p className="mt-3 text-sm text-navy-800/70">
              Trip{" "}
              <Link href="/ops/trips" className="font-semibold text-forest-700 hover:underline">
                {p.movement.movementCode}
              </Link>{" "}
              · {p.movement.originCode} → {p.movement.destCode} · {p.movement.status}
              {p.movement.faStatus ? ` · FA ${p.movement.faStatus}` : ""}
            </p>
          ) : (
            <p className="mt-3 text-sm text-navy-800/55">Not linked to a trip yet — attach from Flight ops.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
