"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Select } from "./ui";

type Pilot = { id: string; name: string };

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
