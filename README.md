# MedStead storefront

**FASTER ACCESS. BETTER CARE.**

Customer-facing freight booking for **MedStead** (MEDSTEAD LLC). A customer can book a shipment from a phone, get a confirmation and tracking ID, and pay later by invoice. Ops updates tracking in `/ops`.

This is **not** the company OS (airline dispatch, CRM, accounting, WMS). Those live on other open PRs and are unfinished. Public brand is **MedStead**. Staging this week is freight book/track only — do not surface an airline or charter product. If the airline name is mentioned at all, it is **MTG Airways** (never STEADAIR, never “MTG Airlines”). No Part 135 operating claims. Background only, if needed: Part 91 + subcontracted 135.

## Why this repo, not Bolt or Squarespace

| Surface | URL | Role |
| --- | --- | --- |
| **This app** | Deploy wherever you host Next.js | Checkout / book / track. Replaces Bolt. |
| Bolt stand-in | https://go.medsteadtransport.com | Temporary site because Hairson does not code. Retire it after this app is live. |
| Squarespace | https://www.medsteadgroup.com | Company marketing door only. Not checkout. Do not put booking there. |

**Do not change live DNS from this repo.** When you are ready, attach `medsteadtransport.com` (and `www` / `go` if you want) at the host — see below.

## What v1 does

- Home, services, account, book a shipment (from/to, cargo, timing), confirmation, tracking
- Services: Express Air 3–5 days, Standard Sea 5–7 days, Freeport & Nassau pickup, customs support, live tracking
- Bahamas freight is a product, not the only product. Hard-to-reach medical transport uses the same form
- Request + confirmation + invoice / pay later. **No card is charged.** A payment rail can be attached later — do not invent Stripe keys
- Ops desk (`/ops`) is employee login (email + password) with roles admin / staff / pilot / cargo. Shared `OPS_PIN` remains break-glass only. Staff can confirm, issue an invoice, mark pay-later or paid offline, push tracking, and assign next actions.
- Contact: [Orders@medsteadgroup.com](mailto:Orders@medsteadgroup.com)
- Official Transport lockup (globe / ship / plane / truck, green cross in the D)
- Navy `#060F22`, green `#16A34A` / `#22C55E`, blue `#2563EB`, Inter
- No Semaglutide, Tirzepatide, GLP-1, peptides, Lilly, or drug catalog
- Prisma + PostgreSQL (Vercel / Neon / Prisma Postgres). Not SQLite.

## Run locally

Need Node 18+ and a PostgreSQL URL (`DATABASE_URL`). SQLite is not used — Vercel serverless cannot persist a local `.db` file.

```bash
npx create-db@latest          # free Prisma Postgres; claim the URL it prints
cp .env.example .env          # paste DATABASE_URL; keep OPS_PIN=local-ops for staging
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Path | What |
| --- | --- |
| `/` | Home |
| `/services` | Services |
| `/book` | Book a shipment |
| `/book/confirm/[code]` | Confirmation |
| `/track` and `/track/[code]` | Tracking |
| `/account` | Signup / login / my bookings |
| `/support` | Orders desk |
| `/ops` | Staff desk — email+password (PIN is break-glass) |

Demo customer (README only — not shown on public pages): `customer@medstead.demo` / `storefront1234`  
Demo tracking ID: `MS-20260820-FLL-NAS-0001`  
Local ops PIN: `local-ops` (break-glass only; change `OPS_PIN` before any public deploy)

### First admin + staff

```bash
ADMIN_EMAIL=hdossantos@medsteadgroup.com ADMIN_PASSWORD='choose-a-long-password' npm run db:seed-admin
```

That creates (or promotes) Hairson as `ADMIN`. Then sign in at `/ops`. Admin → People to create staff / pilot / cargo seats and toggle rules. Optional local demo seats: `SEED_DEMO_STAFF=1 DEMO_STAFF_PASSWORD='…' npm run db:seed`.

The future **MTG Airways** app is separate. It will call `/api/integrations/airline/*` against this platform (see `docs/AIRLINE_SEAM.md`). No airline booking site is shipped here. Part 135 is not live.

Production build:

```bash
npm run build
npm start
```

## How this replaces Bolt

1. Run this app on any Node host (Vercel, Railway, a VPS, etc.).
2. Walk the phone flow: account → book → confirmation → track. Use `/ops` to move status so tracking looks live.
3. When Hairson is happy, point `medsteadtransport.com` at this host (see next section). Leave Squarespace on `medsteadgroup.com`.
4. After DNS cuts over, retire https://go.medsteadtransport.com. Until then Bolt can stay up.

## Attach `medsteadtransport.com` later (do not change DNS now)

This app does not edit registrar or DNS settings.

When you are ready:

1. Deploy this repo to HTTPS.
2. At the DNS host for `medsteadtransport.com`, add the records the platform gives you (usually an A/ALIAS for apex and a CNAME for `www`).
3. Add `medsteadtransport.com` and `www.medsteadtransport.com` as custom domains on the host. Set `SESSION_SECRET` and a new `OPS_PIN` in the host env. Never commit those values.
4. Optional: keep `go.medsteadtransport.com` as a CNAME to the same app until Bolt is turned off.
5. Leave https://www.medsteadgroup.com on Squarespace.

## Payments later

V1 uses `lib/payments.ts` (`invoice_pay_later`). When a real rail is ready, add the provider keys to the **host** environment and implement checkout there. Do not put Stripe (or any) secret keys in this repo.

## Stack

Next.js 14 App Router, TypeScript, Tailwind, Prisma + PostgreSQL, signed httpOnly cookies. No NextAuth, no Capacitor, no clinic catalog.

## HTTPS staging (Vercel, no live DNS)

Do **not** attach `medsteadtransport.com`, `www`, or `go`. Live freight DNS stays on Bolt.

This app must be a **full Next.js** deploy (Node serverless), not a static export. Book and track write/read Postgres via `/api/bookings` and `/track/[code]`. This week’s staging is that freight desk only — no airline/charter product, no STEADAIR, no Part 135 operating claims.

On the Vercel project (Hobby/free is fine):

1. `vercel login` (Hairson’s account that claimed the temp deploy), then from this repo:
   ```bash
   vercel link
   vercel env add DATABASE_URL
   vercel env add SESSION_SECRET
   vercel env add OPS_PIN
   vercel --prod
   ```
   Or in the dashboard: Settings → Environment Variables, then Redeploy. Do not invent tokens — only Hairson can log in.
2. `DATABASE_URL` — claimed Prisma Postgres / Vercel Postgres / Neon.
3. `SESSION_SECRET` — `openssl rand -base64 48`
4. `OPS_PIN` — staging uses `local-ops`
5. After the DB URL is set, run `npm run db:setup` against that URL (from a laptop with the same `.env`) so demo codes exist.

Demo track code after seed: `MS-20260820-FLL-NAS-0001`. Ops PIN: `local-ops`.

## Legal / brand

- Brand spelling: **MedStead** (never MeadStead)
- MedStead is not a licensed customs broker
- Warehouse: WareSpace – MedStead, 700 NW 57th Ct, Unit C15, Fort Lauderdale, FL 33309
- Airline name if mentioned at all: **MTG Airways** (never STEADAIR). Not a live airline/charter product on this storefront. No Part 135 operating claims.
