# Airline integration seam

The **airline product (MTG Airways)** is a **separate app later**. This repo is the MedStead company platform: freight store, ops desk, staff directory, assignments, and the shared schedule/docs tables the airline app will call.

Part 135 is **not live**. Internal `operatorName` is **MTG Airways** (never STEADAIR). No public charter booker lives here.

## MedStead owns

| Surface | What |
| --- | --- |
| `User` + `UserRole` | Customers (`CUSTOMER`) and employees (`ADMIN`, `STAFF`, `PILOT`, `CARGO`) |
| `Booking` | Freight / transport bookings (`MS-…` codes) |
| `WorkAssignment` | Next actions tied to a booking and/or a movement |
| `Movement` | Shared cargo + passenger schedule / capacity |
| `MovementDocument` | Commercial Invoice, Packing List, Air Waybill, Customs Declaration, Manifest |
| `/ops` | Staff desk (email+password). `OPS_PIN` is break-glass only |
| `/account` | Freight customers only |

## Airline app will call

Auth: `Authorization: Bearer $AIRLINE_APP_TOKEN` (or `x-airline-token`). Admin/staff with `manage_schedule` may call the same routes from this app.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/integrations/airline/movements` | List schedule + attached bookings/docs |
| `POST` | `/api/integrations/airline/movements` | Upsert a `CARGO` or `PASSENGER` movement; optional `bookingCodes[]` to attach freight |
| `POST` | `/api/integrations/airline/movements/:id/documents` | Attach one of the five existing document kinds |
| `GET` | `/api/integrations/airline/staff` | Same employee directory (do not invent a second staff table) |

`POST` movement body: `kind`, `originCode`, `destCode`, optional `movementCode`, `status`, `scheduledAt`, `capacityWeightLb`, `capacityPieces`, `capacitySeats`, `assignedPilotId`, `bookingCodes`, `notes`.

Passenger legs use `kind: "PASSENGER"` and `capacitySeats`. Cargo legs use `kind: "CARGO"` and weight/pieces. Codes: cargo `MS-YYYYMMDD-ORIGIN-DEST-####`, passenger `MTG-…`.

## Do not do in the airline app

- A second employee login table
- A second freight booking ledger
- New document kinds unless PRODUCT_SPEC already names them
- Public Part 135 / STEADAIR claims
