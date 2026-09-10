# Bolt Flight Ops to MedStead import

Staff use MedStead /ops (trips / employees / assignments) as the one-app Flight Ops path. Bolt Flight Ops remains live until this path is smoke-tested.

Aug 31 CSVs (ops-profiles-FROM-2026-08-31.csv, ops-passengers-FROM-2026-08-31.csv) are an interim snapshot. Re-export before any production apply if Bolt has moved on.

## Run

```bash
# Dry-run (default) — parses CSVs, prints plan, never opens the DB
npx tsx scripts/import-flight-ops.ts
npx tsx scripts/import-flight-ops.ts --dry-run


Use package script import:flight-ops
```

### CSV paths

Flags: --profiles PATH, --passengers PATH, --dir PATH
Env: FLIGHT_OPS_PROFILES, FLIGHT_OPS_PASSENGERS, IMPORT_DIR
Defaults under ./import-data/flight-ops/ for the Aug 31 filenames.

Do not commit real CSV PII. import-data/** is gitignored (keep .gitkeep only).
Drive folder id: 1-pMVCG3RqqfsBQQykqQpHUZehlLj4mk1

## Role map (profiles.role to UserRole)

| Bolt role | MedStead | Notes |
| --- | --- | --- |
| admin (also superadmin / owner) | ADMIN | Full ops desk |
| pilot | PILOT | Trip board / assignments |
| cargo / warehouse / cargo-ish | CARGO | Warehouse lane + board |
| manager | STAFF | Closest existing seat |
| crew_requester | STAFF | Closest existing seat |
| requester | STAFF | Closest existing seat |
| doctor | STAFF | Closest existing seat — not a clinic module |
| other unmapped | skipped (flagged) | Fix CSV or extend mapImportedEmployeeRole |

Implementation: lib/staff.ts mapImportedEmployeeRole.

## What gets written

### Profiles to staff User

| Bolt column | MedStead |
| --- | --- |
| id | User.boltProfileId (idempotent) |
| email | User.email (unique upsert key) |
| full_name | User.name |
| phone | User.phone |
| role | mapped User.role |
| is_active | logged only; new invites stay inactive until credential set |

Credentials: never invented, never copied from Bolt. New seats are inactive invites (active=false, mustResetPassword=true, unusable random hash discarded).
Admin sets a real credential in /ops/employees, then enables the seat. Existing staff password hashes are never overwritten on apply.

### Passengers to Passenger

Flying customers land on the Passenger model (airline-seam aware via optional movementId; not a second freight booking ledger).

| Bolt column | MedStead |
| --- | --- |
| id | Passenger.boltPassengerId |
| flight_request_id | Passenger.boltFlightRequestId |
| name, email, phone, address, notes | same |
| weight_lbs | weightLbs |
| passport fields / nationality / date_of_birth | internal ops PII |
| profile_id | links profileUserId when imported |
| response_status, created_at | responseStatus, boltCreatedAt |

Passport fields stay internal. Do not surface them on the public freight store.

## Constraints

- Freight storefront stays intact (/book, /track, invoice / pay later).
- No STEADAIR. No public Part 135 / MTG Airways marketing door.
- No clinic / peptides import path here.
- Capacitor / iOS shell files unchanged.
- No Vercel env or DNS changes from this script.

## After dry-run (Hairson)

1. Confirm role mapping and row counts look right.
2. Apply migrations on the staging DB: npx prisma migrate deploy
3. Run apply mode against staging only.
4. In /ops/employees, set credentials and enable seats for people who should sign in.
5. Smoke-test /ops/trips, /ops/employees, /ops/assignments.
6. Keep Bolt Flight Ops up until that smoke test passes.

Bolt stays until smoke-tested. Do not treat Aug 31 CSVs as final production truth without a fresh export.
