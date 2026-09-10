import { nextMovementCode } from "./airline-seam";
import {
  CALL_CENTER_SOURCE,
  CALL_TYPES,
  CALL_TYPE_LABEL,
  CALL_URGENCIES,
  normalizeCallEnum,
  parseReceivedAt,
  type CallTypeName,
  type CallUrgencyName,
} from "./call-center";
import { prisma } from "./prisma";

export type PersistCallInput = {
  callerName: string;
  callerPhone: string;
  callbackPhone?: string;
  callerOrg?: string;
  callType: string;
  origin?: string;
  destination: string;
  notes?: string;
  urgency?: string;
  source?: string;
  receivedAt?: string;
};

/**
 * Resolve Del / dispatch assignee: env email override, else first active ADMIN.
 */
export async function resolveDispatchAssigneeId() {
  const email = process.env.CALL_DISPATCH_ASSIGNEE_EMAIL?.trim().toLowerCase();
  if (email) {
    const hit = await prisma.user.findFirst({
      where: { email, active: true, role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  const admin = await prisma.user.findFirst({
    where: { active: true, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function activePilotIds() {
  const pilots = await prisma.user.findMany({
    where: { active: true, role: "PILOT" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  return pilots.map((p) => p.id);
}

/**
 * Persist Call Center (or staff) intake: CallLog + Del next-action.
 * organ_rescue also opens a cargo Movement stub and Notify-pilots next-actions.
 * No PHI. No Part 135 / STEADAIR marketing claims.
 */
export async function persistIncomingCall(input: PersistCallInput, actorId?: string | null) {
  const callerName = input.callerName.trim();
  const callerPhone = input.callerPhone.trim();
  const callbackPhone = input.callbackPhone?.trim() || null;
  const dest = input.destination.trim().toUpperCase();
  const callType = normalizeCallEnum(input.callType, CALL_TYPES);
  const urgencyRaw =
    input.urgency?.trim() ||
    (input.callType.toLowerCase().replace(/-/g, "_") === "organ_rescue" ? "organ_clock" : "urgent");
  const urgency = normalizeCallEnum(urgencyRaw, CALL_URGENCIES) as CallUrgencyName | null;
  if (!callType) return { error: "Unknown callType. Use organ_rescue | medical_cargo | doctor_charter | other_urgent_medical." };
  if (!urgency) return { error: "Unknown urgency. Use routine | urgent | organ_clock." };
  if (!callerName || !callerPhone) return { error: "callerName and callerPhone are required. No patient identifiers." };
  if (!dest) return { error: "destination is required." };
  const notes = (input.notes ?? "").trim();
  if (!notes) return { error: "notes are required (operational only — no PHI)." };

  const received = parseReceivedAt(input.receivedAt);
  if (received && typeof received === "object" && "error" in received) return received;

  const origin = (input.origin || "FLL").trim().toUpperCase();
  const org = input.callerOrg?.trim() || "Phone intake";
  const rescue = callType === "ORGAN_RESCUE";
  const typeLabel = CALL_TYPE_LABEL[callType as CallTypeName];
  const source = input.source?.trim() || CALL_CENTER_SOURCE;

  const dispatchId = await resolveDispatchAssigneeId();
  if (!dispatchId) {
    return { error: "No active ADMIN/STAFF seat to receive Del dispatch. Seed an admin first." };
  }

  let movementId: string | null = null;
  let movementCode: string | null = null;

  if (rescue) {
    const code = nextMovementCode("CARGO", origin, dest, received as Date);
    const movement = await prisma.movement.create({
      data: {
        movementCode: code,
        kind: "CARGO",
        status: "REQUESTED",
        originCode: origin,
        destCode: dest,
        scheduledAt: received as Date,
        operatorName: "MedStead Ops",
        notes: [
          "TIME-CRITICAL organ/rescue stub from Call Center.",
          `Caller facility: ${org} · ${callerPhone}.`,
          "No patient name/DOB/MRN. Part 135 not live.",
          notes,
        ].join(" "),
      },
    });
    movementId = movement.id;
    movementCode = movement.movementCode;
  }

  const call = await prisma.callLog.create({
    data: {
      receivedAt: received as Date,
      callerName,
      callerPhone,
      callbackPhone,
      callerOrg: input.callerOrg?.trim() || null,
      callType,
      origin,
      destination: dest,
      notes,
      urgency,
      source,
      routedTo: "DEL",
      movementId,
    },
  });

  const dispatchTitle = rescue
    ? `Dispatch organ/rescue · ${origin}→${dest}`
    : `Dispatch call · ${typeLabel} · ${dest}`;
  const dispatchNote = [
    `${org} · ${callerPhone}`,
    callbackPhone ? `callback ${callbackPhone}` : null,
    `CallLog ${call.id}`,
    movementCode ? `Movement ${movementCode}` : null,
    notes,
  ]
    .filter(Boolean)
    .join(" · ");

  const dispatchAssignment = await prisma.workAssignment.create({
    data: {
      title: dispatchTitle,
      note: dispatchNote,
      kind: "NEXT_ACTION",
      assigneeId: dispatchId,
      assignerId: actorId || null,
      movementId,
    },
  });

  const notifyAssignmentIds: string[] = [];
  if (rescue && movementId) {
    const pilots = await activePilotIds();
    const notifyTargets = pilots.length > 0 ? pilots : [dispatchId];
    for (const pilotId of notifyTargets) {
      const a = await prisma.workAssignment.create({
        data: {
          title: `Notify pilots · rescue ${movementCode}`,
          note: `TIME-CRITICAL ${origin}→${dest}. Call intake on board. Acknowledge in-app. No PHI.`,
          kind: pilots.includes(pilotId) ? "FLIGHT_TRIP" : "NEXT_ACTION",
          assigneeId: pilotId,
          assignerId: actorId || null,
          movementId,
        },
      });
      notifyAssignmentIds.push(a.id);
    }
  }

  return {
    ok: true as const,
    callId: call.id,
    movementId,
    movementCode,
    dispatchAssignmentId: dispatchAssignment.id,
    notifyAssignmentIds,
    callType,
    urgency,
  };
}
