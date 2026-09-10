/**
 * FlightAware AeroAPI client for internal ops flight monitoring.
 * Docs: https://www.flightaware.com/commercial/aeroapi/
 *
 * Never invent or commit FLIGHTAWARE_API_KEY. When the key is missing the
 * helpers return offline / empty results — no fake live data.
 */

export const FA_STATUSES = [
  "SCHEDULED",
  "EN_ROUTE",
  "ON_TIME",
  "DELAYED",
  "CANCELED",
  "ARRIVED",
  "UNKNOWN",
  "OFFLINE",
] as const;
export type FaStatus = (typeof FA_STATUSES)[number];

export const FA_STATUS_LABEL: Record<FaStatus, string> = {
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En route",
  ON_TIME: "On time",
  DELAYED: "Delayed",
  CANCELED: "Canceled",
  ARRIVED: "Arrived",
  UNKNOWN: "Unknown",
  OFFLINE: "Monitor offline",
};

const AEROAPI_BASE = "https://aeroapi.flightaware.com/aeroapi";

export function flightAwareConfigured() {
  return Boolean(process.env.FLIGHTAWARE_API_KEY?.trim());
}

export type AeroFlight = {
  ident?: string;
  fa_flight_id?: string;
  status?: string;
  cancelled?: boolean;
  diverted?: boolean;
  departure_delay?: number | null;
  arrival_delay?: number | null;
  scheduled_out?: string | null;
  actual_out?: string | null;
  estimated_out?: string | null;
  scheduled_in?: string | null;
  actual_in?: string | null;
  estimated_in?: string | null;
  origin?: { code?: string; code_iata?: string } | string | null;
  destination?: { code?: string; code_iata?: string } | string | null;
};

export type NormalizedFlight = {
  faStatus: FaStatus;
  faStatusText: string;
  faFlightId: string | null;
  ident: string | null;
  faDelaySeconds: number | null;
  scheduledOut: Date | null;
  actualOut: Date | null;
  scheduledIn: Date | null;
  actualIn: Date | null;
  rawStatus: string | null;
};

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Map AeroAPI flight row → normalized badge (no invented live data). */
export function normalizeAeroFlight(f: AeroFlight): NormalizedFlight {
  const text = (f.status || "").trim();
  const delay = f.departure_delay ?? f.arrival_delay ?? null;
  let faStatus: FaStatus = "UNKNOWN";

  if (f.cancelled) {
    faStatus = "CANCELED";
  } else if (f.actual_in) {
    faStatus = "ARRIVED";
  } else if (f.actual_out || /^en\s*route/i.test(text) || /\bactive\b/i.test(text)) {
    if (typeof delay === "number" && delay > 15 * 60) faStatus = "DELAYED";
    else if (/on\s*time/i.test(text)) faStatus = "ON_TIME";
    else faStatus = "EN_ROUTE";
  } else if (/cancel/i.test(text)) {
    faStatus = "CANCELED";
  } else if (/delay/i.test(text) || (typeof delay === "number" && delay > 15 * 60)) {
    faStatus = "DELAYED";
  } else if (/schedul|filed/i.test(text) || f.scheduled_out) {
    if (typeof delay === "number" && delay > 15 * 60) faStatus = "DELAYED";
    else if (/on\s*time/i.test(text)) faStatus = "ON_TIME";
    else faStatus = "SCHEDULED";
  } else if (/arriv|landed|gate/i.test(text)) {
    faStatus = "ARRIVED";
  }

  return {
    faStatus,
    faStatusText: text || FA_STATUS_LABEL[faStatus],
    faFlightId: f.fa_flight_id || null,
    ident: f.ident || null,
    faDelaySeconds: typeof delay === "number" ? delay : null,
    scheduledOut: parseDate(f.scheduled_out),
    actualOut: parseDate(f.actual_out || f.estimated_out),
    scheduledIn: parseDate(f.scheduled_in),
    actualIn: parseDate(f.actual_in || f.estimated_in),
    rawStatus: text || null,
  };
}

/** Map FlightAware badge → optional MovementStatus nudge (never invent COMPLETE without arrival). */
export function movementStatusFromFa(fa: FaStatus, current: string): string | null {
  if (fa === "CANCELED") return "HOLD";
  if (fa === "ARRIVED") return "COMPLETE";
  if (fa === "EN_ROUTE" || fa === "ON_TIME" || fa === "DELAYED") {
    if (current === "REQUESTED" || current === "SCHEDULED") return "DISPATCHED";
  }
  if (fa === "SCHEDULED" && current === "REQUESTED") return "SCHEDULED";
  return null;
}

export async function fetchFlightsByIdent(ident: string): Promise<
  | { ok: true; offline: false; flights: AeroFlight[] }
  | { ok: true; offline: true; flights: []; reason: string }
  | { ok: false; offline: boolean; error: string; flights: [] }
> {
  const key = process.env.FLIGHTAWARE_API_KEY?.trim();
  if (!key) {
    return { ok: true, offline: true, flights: [], reason: "FLIGHTAWARE_API_KEY not set" };
  }
  const clean = ident.trim().toUpperCase().replace(/\s+/g, "");
  if (!clean) {
    return { ok: false, offline: false, error: "ident required", flights: [] };
  }

  const url = `${AEROAPI_BASE}/flights/${encodeURIComponent(clean)}`;
  try {
    const res = await fetch(url, {
      headers: { "x-apikey": key, Accept: "application/json" },
      // Server-side only
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, offline: false, error: "FlightAware rejected the API key", flights: [] };
    }
    if (res.status === 404) {
      return { ok: true, offline: false, flights: [] };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        offline: false,
        error: `AeroAPI ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`,
        flights: [],
      };
    }
    const data = (await res.json()) as { flights?: AeroFlight[] };
    return { ok: true, offline: false, flights: Array.isArray(data.flights) ? data.flights : [] };
  } catch (e) {
    return {
      ok: false,
      offline: false,
      error: e instanceof Error ? e.message : "FlightAware request failed",
      flights: [],
    };
  }
}

/** Pick the best matching flight for a movement (prefer same route / most recent). */
export function pickBestFlight(
  flights: AeroFlight[],
  opts?: { originCode?: string; destCode?: string; faFlightId?: string | null },
): AeroFlight | null {
  if (!flights.length) return null;
  if (opts?.faFlightId) {
    const hit = flights.find((f) => f.fa_flight_id === opts.faFlightId);
    if (hit) return hit;
  }
  const origin = opts?.originCode?.toUpperCase();
  const dest = opts?.destCode?.toUpperCase();
  const scored = flights.map((f) => {
    let score = 0;
    const o =
      typeof f.origin === "string"
        ? f.origin
        : f.origin?.code_iata || f.origin?.code || "";
    const d =
      typeof f.destination === "string"
        ? f.destination
        : f.destination?.code_iata || f.destination?.code || "";
    if (origin && o.toUpperCase().includes(origin)) score += 2;
    if (dest && d.toUpperCase().includes(dest)) score += 2;
    if (f.actual_out) score += 1;
    if (!f.cancelled) score += 1;
    return { f, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.f ?? null;
}
