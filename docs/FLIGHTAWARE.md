# FlightAware monitoring (internal ops)

Staff hive links freight bookings and passengers to a Movement, then monitors that flight with FlightAware AeroAPI when configured.

## Env (Vercel)

1. Create an AeroAPI key at flightaware.com commercial aeroapi (Hairson / ops owner).
2. Vercel project → Settings → Environment Variables:
   - FLIGHTAWARE_API_KEY = (the key; never commit it)
   - Optional CRON_SECRET or FLIGHTAWARE_WEBHOOK_SECRET for scheduled sync callers
3. Redeploy after saving env vars.

If FLIGHTAWARE_API_KEY is missing, ops shows Offline / empty monitor badges. No fake live times are invented.

## Behavior

- Movement fields: flightIdent, faFlightId, faStatus, faStatusText, faDelaySeconds, lastSyncedAt, scheduled/actual out/in, aircraftId
- Sync: POST /api/ops/flightaware/sync (staff with manage_schedule) or GET with cron secret / x-vercel-cron
- UI: /ops and /ops/trips show FA badges; Refresh FA / Sync all FA buttons
- Status badges: SCHEDULED, EN_ROUTE, ON_TIME, DELAYED, CANCELED, ARRIVED, UNKNOWN, OFFLINE

## Cron

Configure a Vercel Cron (or external scheduler) to hit /api/ops/flightaware/sync about every 15 minutes with Authorization Bearer CRON_SECRET. Manual sync from the trips desk always works for admins.

Internal ops only — not public airline marketing.
