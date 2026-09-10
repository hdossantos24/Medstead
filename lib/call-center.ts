import { timingSafeEqual } from "crypto";

export const CALL_CENTER_SOURCE = "+1-954-228-4551";
export const CALL_CENTER_LINE = "+1 954-228-4551";

export const CALL_TYPES = [
  "ORGAN_RESCUE",
  "MEDICAL_CARGO",
  "DOCTOR_CHARTER",
  "OTHER_URGENT_MEDICAL",
] as const;
export type CallTypeName = (typeof CALL_TYPES)[number];

export const CALL_URGENCIES = ["ROUTINE", "URGENT", "ORGAN_CLOCK"] as const;
export type CallUrgencyName = (typeof CALL_URGENCIES)[number];

export const CALL_TYPE_LABEL: Record<CallTypeName, string> = {
  ORGAN_RESCUE: "Organ / rescue",
  MEDICAL_CARGO: "Medical cargo",
  DOCTOR_CHARTER: "Doctor charter",
  OTHER_URGENT_MEDICAL: "Other urgent medical",
};

export const PHI_FIELD_KEYS = [
  "patientName",
  "patient_name",
  "patient",
  "dob",
  "dateOfBirth",
  "date_of_birth",
  "patientDob",
  "patient_dob",
  "mrn",
  "MRN",
  "diagnosis",
] as const;

export type CallIngestFields = {
  receivedAt?: string;
  callerName: string;
  callerPhone: string;
  callbackPhone?: string;
  callerOrg?: string;
  callType: string;
  origin?: string;
  destination: string;
  notes: string;
  urgency?: string;
  source?: string;
};

function headerToken(req: Request) {
  const bearer = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(bearer.trim());
  if (match?.[1]) return match[1].trim();
  return (
    (req.headers.get("x-call-center-token") ?? "").trim() ||
    (req.headers.get("x-call-ingest-token") ?? "").trim()
  );
}

/** Accept CALL_INGEST_TOKEN, CALL_CENTER_TOKEN, or CALL_CENTER_INGEST_TOKEN. */
function expectedToken() {
  return (
    process.env.CALL_INGEST_TOKEN?.trim() ||
    process.env.CALL_CENTER_TOKEN?.trim() ||
    process.env.CALL_CENTER_INGEST_TOKEN?.trim() ||
    ""
  );
}

export function callCenterTokenOk(req: Request) {
  const expected = expectedToken();
  const provided = headerToken(req);
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function phiFieldsPresent(body: Record<string, unknown>) {
  return PHI_FIELD_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(body, k));
}

function pick(body: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = body[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

export function readCallBody(body: Record<string, unknown>): CallIngestFields {
  const callType = pick(body, "callType", "call_type");
  const urgency =
    pick(body, "urgency") ||
    (callType.toLowerCase().replace(/-/g, "_") === "organ_rescue" ? "organ_clock" : "urgent");
  return {
    receivedAt: pick(body, "receivedAt", "received_at") || undefined,
    callerName: pick(body, "callerName", "caller_name"),
    callerPhone: pick(body, "callerPhone", "caller_phone"),
    callbackPhone: pick(body, "callbackPhone", "callback_phone") || undefined,
    callerOrg: pick(body, "callerOrg", "caller_org") || undefined,
    callType,
    origin: pick(body, "origin") || undefined,
    destination: pick(body, "destination"),
    notes: pick(body, "notes"),
    urgency,
    source: pick(body, "source") || CALL_CENTER_SOURCE,
  };
}

export function parseReceivedAt(raw?: string) {
  if (!raw?.trim()) return new Date();
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return { error: "receivedAt must be ISO-8601." as const };
  return d;
}

export function normalizeCallEnum<T extends string>(raw: string | undefined, allowed: readonly T[]): T | null {
  const v = (raw ?? "").trim().toUpperCase().replace(/-/g, "_");
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
