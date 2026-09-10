# FlightAware monitoring (internal ops)

Staff hive links freight bookings and passengers to a Movement, then monitors that flight with FlightAware AeroAPI when configured.

## Compliance hold → go-live

While AeroAPI is on hold there is **no** `FLIGHTAWARE_API_KEY` in Production. Cron and manual sync stay **offline-safe**: they stamp `OFFLINE` / “not configured” badges and never invent live times.

After the hold clears:

1. Create an AeroAPI key at flightaware.com commercial aeroapi (Hairson / ops owner).
2. Vercel → Project → Settings → Environment Variables → **Production**:
   - `FLIGHTAWARE_API_KEY` = (the key; never commit it)
   - `CRON_SECRET` = long random string (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`)
   - Optional: `FLIGHTAWARE_WEBHOOK_SECRET` (same role as cron secret for external callers)
3. Redeploy Production so the new env vars load.
4. Confirm `/ops` and `/ops/trips` show **FlightAware on** (not “FA not configured”).
5. Optional: click **Sync all FA** on `/ops/trips`, or wait for the ~15m cron.

## Env (Vercel)

| Var | Required | Purpose |
| --- | --- | --- |
| `FLIGHTAWARE_API_KEY` | for live monitor | AeroAPI key — never commit |
| `CRON_SECRET` | for scheduled sync | Bearer token Vercel Cron / external schedulers send |
| `FLIGHTAWARE_WEBHOOK_SECRET` | optional | Alternate shared secret accepted by the sync route |

If `FLIGHTAWARE_API_KEY` is missing, ops shows offline / not-configured badges. No fake live times are invented.

## Cron

`vercel.json` schedules `GET /api/ops/flightaware/sync` every **15 minutes** (`*/15 * * * *`). Requires a Vercel plan that allows sub-daily crons (Pro+).

- Prefer `Authorization: Bearer <CRON_SECRET>` (auto when `CRON_SECRET` is set).
- Route also accepts `x-vercel-cron` and `x-cron-secret`.
- Manual sync: `POST /api/ops/flightaware/sync` from a staff session with `manage_schedule`.

## Behavior

- Movement fields: flightIdent, faFlightId, faStatus, faStatusText, faDelaySeconds, lastSyncedAt, scheduled/actual out/in, aircraftId
- Sync: POST `/api/ops/flightaware/sync` (staff with manage_schedule) or GET with cron secret / x-vercel-cron
- UI: `/ops` and `/ops/trips` show FA badges; Refresh FA / Sync all FA buttons
- Status badges: SCHEDULED, EN_ROUTE, ON_TIME, DELAYED, CANCELED, ARRIVED, UNKNOWN, OFFLINE
- When the key is missing, badges read **FA not configured** (stale live statuses are not shown)

## Staff passwords (imported Flight Ops seats)

Bolt / CSV import never invents passwords. New seats land as inactive invites (`mustResetPassword=true`, unusable hash).

Admin path (no email required):

1. Sign in as admin → `/ops/employees` (People).
2. Seats that still need a password show an **Invite · set password** badge; a banner counts them.
3. Click **Set password & enable** (or **Reset password** on an active seat).
4. Enter 8+ characters in the prompt; share the credential **out of band**. Plaintext is never logged or committed — only a bcrypt hash is stored and `mustResetPassword` clears.

Invite-locked staff cannot sign in at `/ops` until an admin sets a password.

Internal ops only — not public airline marketing.
