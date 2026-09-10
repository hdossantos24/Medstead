import { prisma } from "./prisma";
import {
  fetchFlightsByIdent,
  flightAwareConfigured,
  movementStatusFromFa,
  normalizeAeroFlight,
  pickBestFlight,
  type FaStatus,
} from "./flightaware";

export type SyncResult = {
  movementId: string;
  movementCode: string;
  ok: boolean;
  offline?: boolean;
  faStatus?: FaStatus | string | null;
  error?: string;
};

/**
 * Sync one movement from FlightAware using flightIdent (or linked aircraft tail).
 * When the API key is missing, stamps OFFLINE without inventing live times.
 */
export async function syncMovementFromFlightAware(movementId: string): Promise<SyncResult> {
  const movement = await prisma.movement.findUnique({
    where: { id: movementId },
    include: { aircraft: true },
  });
  if (!movement) return { movementId, movementCode: "?", ok: false, error: "not found" };

  const ident = (movement.flightIdent || movement.aircraft?.tailNumber || "").trim();
  if (!ident) {
    return {
      movementId: movement.id,
      movementCode: movement.movementCode,
      ok: false,
      error: "Set flight ident or assign a fleet tail first",
    };
  }

  if (!flightAwareConfigured()) {
    await prisma.movement.update({
      where: { id: movement.id },
      data: {
        faStatus: "OFFLINE",
        faStatusText: "FlightAware key not configured",
        lastSyncedAt: new Date(),
      },
    });
    return {
      movementId: movement.id,
      movementCode: movement.movementCode,
      ok: true,
      offline: true,
      faStatus: "OFFLINE",
    };
  }

  const res = await fetchFlightsByIdent(ident);
  if (!res.ok) {
    return {
      movementId: movement.id,
      movementCode: movement.movementCode,
      ok: false,
      error: res.error,
    };
  }
  if (res.offline) {
    await prisma.movement.update({
      where: { id: movement.id },
      data: {
        faStatus: "OFFLINE",
        faStatusText: res.reason,
        lastSyncedAt: new Date(),
      },
    });
    return {
      movementId: movement.id,
      movementCode: movement.movementCode,
      ok: true,
      offline: true,
      faStatus: "OFFLINE",
    };
  }

  const best = pickBestFlight(res.flights, {
    originCode: movement.originCode,
    destCode: movement.destCode,
    faFlightId: movement.faFlightId,
  });

  if (!best) {
    await prisma.movement.update({
      where: { id: movement.id },
      data: {
        faStatus: "UNKNOWN",
        faStatusText: "No FlightAware match for ident",
        lastSyncedAt: new Date(),
        flightIdent: ident,
      },
    });
    return {
      movementId: movement.id,
      movementCode: movement.movementCode,
      ok: true,
      faStatus: "UNKNOWN",
    };
  }

  const n = normalizeAeroFlight(best);
  const nextStatus = movementStatusFromFa(n.faStatus, movement.status);

  await prisma.movement.update({
    where: { id: movement.id },
    data: {
      flightIdent: n.ident || ident,
      faFlightId: n.faFlightId,
      faStatus: n.faStatus,
      faStatusText: n.faStatusText,
      faDelaySeconds: n.faDelaySeconds,
      lastSyncedAt: new Date(),
      scheduledOut: n.scheduledOut,
      actualOut: n.actualOut,
      scheduledIn: n.scheduledIn,
      actualIn: n.actualIn,
      ...(nextStatus ? { status: nextStatus as "HOLD" | "COMPLETE" | "DISPATCHED" | "SCHEDULED" } : {}),
    },
  });

  return {
    movementId: movement.id,
    movementCode: movement.movementCode,
    ok: true,
    faStatus: n.faStatus,
  };
}

/** Sync all open movements that have an ident or aircraft tail. */
export async function syncOpenMovementsFromFlightAware(limit = 40): Promise<SyncResult[]> {
  const open = await prisma.movement.findMany({
    where: {
      status: { in: ["REQUESTED", "SCHEDULED", "DISPATCHED", "HOLD"] },
      OR: [{ flightIdent: { not: null } }, { aircraftId: { not: null } }],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });
  const out: SyncResult[] = [];
  for (const m of open) {
    out.push(await syncMovementFromFlightAware(m.id));
  }
  return out;
}
