"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QueueItem } from "@/lib/staff-queue";
import { bookingPatchForKind } from "@/lib/staff-queue";
import { Button, Card } from "./ui";

export function NextQueue({ items, hero }: { items: QueueItem[]; hero?: boolean }) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-2xl font-semibold text-navy-950">You&apos;re clear. Nothing is waiting on you.</p>
        <p className="mt-2 text-sm text-navy-800/60">
          When someone else finishes their step, the next item will land here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <QueueCard key={item.id} item={item} hero={hero && i === 0} />
      ))}
    </div>
  );
}

function QueueCard({ item, hero }: { item: QueueItem; hero?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    if (item.assignmentId && (item.kind === "open_assignment" || item.kind === "acknowledge_brief")) {
      if (item.kind === "acknowledge_brief" || item.actionLabel === "Mark done") {
        const res = await fetch(`/api/ops/assignments/${item.assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error || "Could not update");
          return;
        }
        router.refresh();
        return;
      }
    }

    const patch = item.bookingCode ? bookingPatchForKind(item.kind) : null;
    if (patch && item.bookingCode) {
      const res = await fetch(`/api/ops/bookings/${encodeURIComponent(item.bookingCode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error || "Update failed");
        return;
      }
      router.refresh();
      return;
    }

    setBusy(false);
    router.push(item.href);
  }

  return (
    <Card className={hero ? "border-2 border-navy-950 p-7" : "p-6"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">{item.who}</p>
      <h2 className={`mt-2 font-semibold text-navy-950 ${hero ? "text-2xl" : "text-xl"}`}>{item.what}</h2>
      <p className="mt-2 text-sm leading-6 text-navy-800/70">{item.why}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={go} disabled={busy} className={`min-h-tap w-full sm:w-auto ${hero ? "min-h-14 text-base" : ""}`}>
          {busy ? "Working…" : item.actionLabel}
        </Button>
        <a href={item.href} className="text-sm font-semibold text-forest-700 hover:underline">
          Open record
        </a>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </Card>
  );
}
