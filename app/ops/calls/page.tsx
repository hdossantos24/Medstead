import Link from "next/link";
import { NextQueue } from "@/components/next-queue";
import { Badge, Card } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth";
import { CALL_TYPE_LABEL, type CallTypeName } from "@/lib/call-center";
import { loadDeskQueue } from "@/lib/desk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Call Log" };

function fmtWhen(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OpsCallsPage() {
  const actor = await requireStaffPage(["ADMIN", "STAFF", "CARGO", "PILOT"]);
  const items = await loadDeskQueue(actor);

  const calls = await prisma.callLog.findMany({
    include: {
      movement: { select: { movementCode: true, status: true, originCode: true, destCode: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 60,
  });

  const callAssignments = items.filter(
    (i) =>
      i.what.toLowerCase().includes("dispatch") ||
      i.what.toLowerCase().includes("notify pilots") ||
      i.what.toLowerCase().includes("rescue") ||
      i.what.toLowerCase().includes("call"),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Phone desk</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Call Log</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Facility / caller only — no patient name, DOB, MRN, or diagnosis. Call Center ingest is live
        via <code className="rounded bg-slate-100 px-1 text-xs">POST /api/calls/ingest</code>. One
        next job below; mark done clears the assignment.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
          Your next call action
        </p>
        <NextQueue items={(callAssignments.length ? callAssignments : items).slice(0, 1)} hero />
      </div>

      {(callAssignments.length > 1 || (!callAssignments.length && items.length > 1)) && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
            After this
          </p>
          <NextQueue
            items={(callAssignments.length ? callAssignments : items).slice(1, 4)}
          />
        </div>
      )}

      <div className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
            Recent calls · {calls.length}
          </p>
          <Link href="/ops/assignments" className="text-sm font-semibold text-forest-700 hover:underline">
            All next-actions
          </Link>
        </div>

        {calls.length === 0 ? (
          <Card className="p-6 text-center sm:p-8">
            <p className="text-lg font-semibold text-navy-950">No calls logged yet</p>
            <p className="mt-2 text-sm leading-6 text-navy-800/60">
              Call Center ingest is live. New phone intake appears here and opens a dispatch
              next-action for Del — check Assignments when a call lands.
            </p>
            <Link
              href="/ops/assignments"
              className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-forest-700 hover:underline"
            >
              Open Assignments
            </Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {calls.map((c) => (
              <li key={c.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                        {fmtWhen(c.receivedAt)} ET · {c.source}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-navy-950">
                        {c.callerName}
                        {c.callerOrg ? ` · ${c.callerOrg}` : ""}
                      </h2>
                      <p className="mt-1 text-sm text-navy-800/70">
                        {c.callerPhone}
                        {c.callbackPhone ? ` · callback ${c.callbackPhone}` : ""}
                        {" · "}
                        {(c.origin || "FLL").toUpperCase()} → {c.destination}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={c.callType === "ORGAN_RESCUE" ? "amber" : "navy"}>
                        {CALL_TYPE_LABEL[c.callType as CallTypeName] || c.callType}
                      </Badge>
                      <Badge tone="green">{c.urgency}</Badge>
                      <Badge tone="navy">→ {c.routedTo}</Badge>
                    </div>
                  </div>
                  {c.notes && (
                    <p className="mt-3 text-sm leading-6 text-navy-800/75">{c.notes}</p>
                  )}
                  {c.movement && (
                    <p className="mt-3 text-sm">
                      <Link href="/ops/trips" className="font-semibold text-forest-700 hover:underline">
                        Movement {c.movement.movementCode}
                      </Link>
                      <span className="text-navy-800/55">
                        {" "}
                        · {c.movement.status} · {c.movement.originCode}→{c.movement.destCode}
                      </span>
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
