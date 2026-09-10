import { NextResponse } from "next/server";
import { getOpsActor } from "@/lib/auth";
import {
  callCenterTokenOk,
  phiFieldsPresent,
  readCallBody,
} from "@/lib/call-center";
import { persistIncomingCall } from "@/lib/call-ingest";

/**
 * POST /api/calls/ingest — Call Center phone intake (no PHI).
 *
 * Auth (either):
 *   Authorization: Bearer $CALL_INGEST_TOKEN  (or CALL_CENTER_TOKEN / CALL_CENTER_INGEST_TOKEN)
 *   x-call-center-token / x-call-ingest-token
 *   or a signed-in ADMIN / STAFF ops session
 *
 * See docs/CALL_CENTER_INGEST.md for curl example.
 */
export async function POST(req: Request) {
  const tokenOk = callCenterTokenOk(req);
  const actor = tokenOk ? null : await getOpsActor();
  const staffOk =
    actor?.kind === "staff" &&
    (actor.user.role === "ADMIN" || actor.user.role === "STAFF");
  if (!tokenOk && !staffOk) {
    return NextResponse.json(
      { error: "Call Center token or sign-in as admin/staff." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "JSON object required." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const phi = phiFieldsPresent(raw);
  if (phi.length) {
    return NextResponse.json(
      {
        error: "Do not send patient name, DOB, MRN, or diagnosis. Those fields are rejected and never stored.",
        fields: phi,
      },
      { status: 400 },
    );
  }

  const fields = readCallBody(raw);
  if (
    !fields.callerName ||
    !fields.callerPhone ||
    !fields.callType ||
    !fields.destination ||
    !fields.notes ||
    (tokenOk && !fields.receivedAt)
  ) {
    return NextResponse.json(
      {
        error:
          "receivedAt, callerName, callerPhone, callType, destination, and notes are required (receivedAt required for token ingest).",
      },
      { status: 400 },
    );
  }

  const res = await persistIncomingCall(
    {
      receivedAt: fields.receivedAt,
      callerName: fields.callerName,
      callerPhone: fields.callerPhone,
      callbackPhone: fields.callbackPhone,
      callerOrg: fields.callerOrg,
      callType: fields.callType,
      origin: fields.origin,
      destination: fields.destination,
      notes: fields.notes,
      urgency: fields.urgency,
      source: fields.source,
    },
    staffOk && actor?.kind === "staff" ? actor.user.id : null,
  );

  if (res && "error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res);
}
