import { timingSafeEqual } from "crypto";

/**
 * Integration seam for the future MTG Airways app.
 *
 * MedStead (this repo) owns: customers, freight bookings, staff users/roles,
 * WorkAssignment, Movement (shared schedule), MovementDocument.
 *
 * The airline app will call /api/integrations/airline with AIRLINE_APP_TOKEN.
 * It must not become a second staff directory or a second booking ledger.
 *
 * Part 135 is not live. operatorName is MTG Airways (never STEADAIR).
 */

export const DOCUMENT_KINDS = [
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "AIR_WAYBILL",
  "CUSTOMS_DECLARATION",
  "MANIFEST",
] as const;
export type DocumentKindName = (typeof DOCUMENT_KINDS)[number];

export const MOVEMENT_KINDS = ["CARGO", "PASSENGER"] as const;
export type MovementKindName = (typeof MOVEMENT_KINDS)[number];

export const MOVEMENT_STATUSES = ["REQUESTED", "SCHEDULED", "DISPATCHED", "COMPLETE", "HOLD"] as const;
export type MovementStatusName = (typeof MOVEMENT_STATUSES)[number];

export const DOCUMENT_KIND_LABEL: Record<DocumentKindName, string> = {
  COMMERCIAL_INVOICE: "Commercial Invoice",
  PACKING_LIST: "Packing List",
  AIR_WAYBILL: "Air Waybill",
  CUSTOMS_DECLARATION: "Customs Declaration",
  MANIFEST: "Import / Export Manifest",
};

export const MOVEMENT_STATUS_LABEL: Record<MovementStatusName, string> = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  DISPATCHED: "Dispatched",
  COMPLETE: "Complete",
  HOLD: "Hold",
};

export function nextMovementCode(kind: MovementKindName, origin: string, dest: string, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const prefix = kind === "PASSENGER" ? "MTG" : "MS";
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}${d}-${origin}-${dest}-${rand}`;
}

export function airlineTokenOk(header: string | null, queryToken?: string | null) {
  const expected = process.env.AIRLINE_APP_TOKEN;
  if (!expected) return false;
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header?.trim() || "";
  const offered = bearer || queryToken || "";
  if (!offered) return false;
  const a = Buffer.from(offered);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type MovementWrite = {
  movementCode?: string;
  kind: MovementKindName;
  status?: MovementStatusName;
  originCode: string;
  destCode: string;
  scheduledAt?: string | null;
  capacityWeightLb?: number | null;
  capacityPieces?: number | null;
  capacitySeats?: number | null;
  notes?: string | null;
  assignedPilotId?: string | null;
  bookingCodes?: string[];
};

export type DocumentWrite = {
  kind: DocumentKindName;
  reference: string;
  note?: string | null;
  bookingCode?: string | null;
};
