# Call Center ingest

Phone desk posts operational call rows into MedStead (no PHI). Staff see them on `/ops/calls` and as next-actions on `/ops` and `/ops/assignments`.

## Env (never commit real values)

Set one of these on the host (Vercel Project Settings > Environment Variables):

| Variable | Purpose |
|---|---|
| `CALL_INGEST_TOKEN`         | Preferred shared secret for Call Center |
| `CALL_CENTER_TOKEN`        | Alias |
| `CALL_CENTER_INGEST_TOKEN` | Alias (PR #1 name) |

Optional: `CALL_DISPATCH_ASSIGNEE_EMAIL` — ADMIN/STAFF email for Del dispatch next-actions (default: first active ADMIN).

## Auth

- `Authorization: Bearer <token>`
- `x-call-center-token: <token>`
- `x-call-ingest-token: <token>`
- Or signed-in ADMIN / STAFF session cookie

## Endpoint

`POST /api/calls/ingest` (also aliased at `POST /api/calls`)

## Body (JSON, no PHI)

**Required:** `receivedAt` (ISO-8601), `callerName`, `callerPhone`, `callType`, `destination`, `notes`.
`source` defaults to `+1-954-228-4551` if omitted; token ingest still requires `receivedAt`.

**Optional:** `callerOrg`, `origin`, `callbackPhone`, `urgency`.

**callType:** `organ_rescue` | `medical_cargo` | `doctor_charter` | `other_urgent_medical`

**urgency:** `routine` | `urgent` | `organ_clock` (defaults to `organ_clock` for organ rescue, else `urgent`)

**Rejected (400, never stored):** `patientName`, `dob` / `dateOfBirth`, `mrn`, `diagnosis` (and snake_case variants).

## What gets created

1. **CallLog** row (facility/caller only).
2. **WorkAssignment** `NEXT_ACTION` for Del/dispatch (first ADMIN, or `CALL_DISPATCH_ASSIGNEE_EMAIL`).
3. If `callType=organ_rescue`: a **Movement** cargo stub (`REQUESTED`, operator `MedStead Ops`) plus **Notify pilots** next-actions (`FLIGHT_TRIP` for each active PILOT, or Del if none).

No Part 135 / STEADAIR marketing claims. Not an OPO.

## Example curl
See docs/call-ingest-example.json for sample POST body.
## How staff clears a next-action
1. Sign in at /ops.
2. Open Calls or Assignments.
3. Tap Mark done on the next job.
## Database migration
Required CallLog table migration ships with this PR.
4. Queue refreshes after Mark done.
