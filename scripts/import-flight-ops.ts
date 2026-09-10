/**
 * Bolt Flight Ops → MedStead staff + passengers importer.
 *
 *   npx tsx scripts/import-flight-ops.ts
 *   npx tsx scripts/import-flight-ops.ts --dry-run
 *   npx tsx scripts/import-flight-ops.ts --apply
 *   npx tsx scripts/import-flight-ops.ts --profiles PATH --passengers PATH
 *
 * Default is dry-run (no DB writes). See docs/FLIGHT_OPS_IMPORT.md.
 *
 * Staff passwords are NEVER invented or copied from Bolt. New seats are inactive
 * invites (active=false, mustResetPassword=true) with an unusable random hash that
 * is discarded immediately. An admin must set a password in /ops/employees before
 * the person can sign in.
 */

import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { basename, resolve } from "path";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mapImportedEmployeeRole, type StaffRole } from "../lib/staff";

type Row = Record<string, string>;
type Mode = "dry-run" | "apply";
type Flag = { file: string; row: number; reason: string };

type PlannedStaff = {
  boltProfileId: string;
  email: string;
  name: string;
  phone: string | null;
  role: StaffRole;
  boltActive: boolean;
  /** New seats stay inactive until password is set. */
  inviteInactive: boolean;
};

type PlannedPassenger = {
  boltPassengerId: string;
  boltFlightRequestId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  weightLbs: number | null;
  notes: string | null;
  address: string | null;
  passportNumber: string | null;
  passportExpirationDate: Date | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  responseStatus: string | null;
  boltProfileId: string | null;
  boltCreatedAt: Date | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function loadDotEnv() {
  for (const name of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function parseArgs(argv: string[]) {
  let apply = false;
  let help = false;
  let profilesPath =
    process.env.FLIGHT_OPS_PROFILES ||
    resolve(process.cwd(), "import-data/flight-ops/ops-profiles-FROM-2026-08-31.csv");
  let passengersPath =
    process.env.FLIGHT_OPS_PASSENGERS ||
    resolve(process.cwd(), "import-data/flight-ops/ops-passengers-FROM-2026-08-31.csv");
  let dir: string | null = process.env.IMPORT_DIR || null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg.startsWith("--profiles=")) profilesPath = resolve(arg.slice("--profiles=".length));
    else if (arg === "--profiles") {
      const next = argv[++i];
      if (!next || next.startsWith("--")) {
        console.error("--profiles requires a path");
        process.exit(2);
      }
      profilesPath = resolve(next);
    } else if (arg.startsWith("--passengers=")) passengersPath = resolve(arg.slice("--passengers=".length));
    else if (arg === "--passengers") {
      const next = argv[++i];
      if (!next || next.startsWith("--")) {
        console.error("--passengers requires a path");
        process.exit(2);
      }
      passengersPath = resolve(next);
    } else if (arg.startsWith("--dir=")) dir = resolve(arg.slice("--dir=".length));
    else if (arg === "--dir") {
      const next = argv[++i];
      if (!next || next.startsWith("--")) {
        console.error("--dir requires a path");
        process.exit(2);
      }
      dir = resolve(next);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  if (dir) {
    profilesPath = resolve(dir, "ops-profiles-FROM-2026-08-31.csv");
    passengersPath = resolve(dir, "ops-passengers-FROM-2026-08-31.csv");
    const altProfiles = resolve(dir, "profiles.csv");
    const altPassengers = resolve(dir, "passengers.csv");
    if (!existsSync(profilesPath) && existsSync(altProfiles)) profilesPath = altProfiles;
    if (!existsSync(passengersPath) && existsSync(altPassengers)) passengersPath = altPassengers;
  }

  return { apply, help, profilesPath, passengersPath };
}

function printHelp() {
  console.log(`Bolt Flight Ops CSV import (staff + passengers)

  npx tsx scripts/import-flight-ops.ts                 # dry-run (default)
  npx tsx scripts/import-flight-ops.ts --dry-run
  npx tsx scripts/import-flight-ops.ts --apply
  npx tsx scripts/import-flight-ops.ts --profiles PATH --passengers PATH
  npx tsx scripts/import-flight-ops.ts --dir PATH

Never invents passwords. New staff seats are inactive invites until an admin
sets a password in /ops/employees. Do not commit secrets or real CSV PII.
See docs/FLIGHT_OPS_IMPORT.md.`);
}

/** Minimal RFC4180-ish CSV parser (quoted fields, commas, CRLF). */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.length > 0) || rows.length === 0) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Row[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const vals = rows[r];
    if (vals.every((v) => !String(v).trim())) continue;
    const obj: Row = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] ?? "").trim();
    });
    out.push(obj);
  }
  return out;
}

function cell(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim() !== "") return String(row[key]).trim();
    const hit = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (hit && String(row[hit]).trim() !== "") return String(row[hit]).trim();
  }
  return "";
}

function parseBool(raw: string, fallback = true) {
  const v = raw.toLowerCase();
  if (!v) return fallback;
  if (["true", "1", "yes", "y", "active"].includes(v)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(v)) return false;
  return fallback;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseFloatOrNull(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function unusableInviteHash() {
  // Discarded random token — never logged, never a real password.
  return bcrypt.hash(randomBytes(32).toString("hex"), 10);
}

function planProfiles(rows: Row[], fileLabel: string, flags: Flag[]) {
  const planned: PlannedStaff[] = [];
  const seenEmail = new Set<string>();
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const boltProfileId = cell(row, "id", "profile_id", "uuid");
    const email = cell(row, "email", "email_address").toLowerCase();
    const name = cell(row, "full_name", "name") || email;
    const phone = cell(row, "phone", "phone_number") || null;
    const roleRaw = cell(row, "role");
    const boltActive = parseBool(cell(row, "is_active", "active"), true);
    const role = mapImportedEmployeeRole(roleRaw);

    if (!email || !email.includes("@")) {
      flags.push({ file: fileLabel, row: rowNum, reason: "missing or invalid email" });
      return;
    }
    if (!role) {
      flags.push({ file: fileLabel, row: rowNum, reason: `unmapped role "${roleRaw || "(empty)"}"` });
      return;
    }
    if (seenEmail.has(email)) {
      flags.push({ file: fileLabel, row: rowNum, reason: `duplicate email ${email}` });
      return;
    }
    seenEmail.add(email);
    if (boltProfileId && !UUID_RE.test(boltProfileId)) {
      flags.push({ file: fileLabel, row: rowNum, reason: `non-UUID profile id kept as boltProfileId=${boltProfileId}` });
    }

    planned.push({
      boltProfileId: boltProfileId || `email:${email}`,
      email,
      name,
      phone,
      role,
      boltActive,
      inviteInactive: true,
    });
  });
  return planned;
}

function planPassengers(rows: Row[], fileLabel: string, flags: Flag[]) {
  const planned: PlannedPassenger[] = [];
  const seen = new Set<string>();
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const boltPassengerId = cell(row, "id", "passenger_id");
    const name = cell(row, "name", "full_name");
    if (!name) {
      flags.push({ file: fileLabel, row: rowNum, reason: "missing name" });
      return;
    }
    if (!boltPassengerId) {
      flags.push({ file: fileLabel, row: rowNum, reason: "missing passenger id" });
      return;
    }
    if (seen.has(boltPassengerId)) {
      flags.push({ file: fileLabel, row: rowNum, reason: `duplicate passenger id ${boltPassengerId}` });
      return;
    }
    seen.add(boltPassengerId);

    planned.push({
      boltPassengerId,
      boltFlightRequestId: cell(row, "flight_request_id") || null,
      name,
      email: (cell(row, "email") || "").toLowerCase() || null,
      phone: cell(row, "phone") || null,
      weightLbs: parseFloatOrNull(cell(row, "weight_lbs", "weight")),
      notes: cell(row, "notes") || null,
      address: cell(row, "address") || null,
      passportNumber: cell(row, "passport_number") || null,
      passportExpirationDate: parseDate(cell(row, "passport_expiration_date")),
      nationality: cell(row, "nationality") || null,
      dateOfBirth: parseDate(cell(row, "date_of_birth")),
      responseStatus: cell(row, "response_status") || null,
      boltProfileId: cell(row, "profile_id") || null,
      boltCreatedAt: parseDate(cell(row, "created_at")),
    });
  });
  return planned;
}

async function applyStaff(prisma: PrismaClient, planned: PlannedStaff[]) {
  let created = 0;
  let updated = 0;
  const byBolt = new Map<string, string>();

  for (const p of planned) {
    const existing =
      (await prisma.user.findFirst({
        where: {
          OR: [
            { email: p.email },
            ...(p.boltProfileId.startsWith("email:") ? [] : [{ boltProfileId: p.boltProfileId }]),
          ],
        },
      })) || null;

    if (!existing) {
      const passwordHash = await unusableInviteHash();
      const user = await prisma.user.create({
        data: {
          email: p.email,
          name: p.name,
          phone: p.phone,
          role: p.role as UserRole,
          active: false,
          mustResetPassword: true,
          passwordHash,
          boltProfileId: p.boltProfileId.startsWith("email:") ? null : p.boltProfileId,
        },
      });
      byBolt.set(p.boltProfileId, user.id);
      created += 1;
      continue;
    }

    // Never overwrite passwordHash. Promote CUSTOMER → staff role; refresh directory fields.
    const nextRole =
      existing.role === "CUSTOMER" || existing.role === p.role ? (p.role as UserRole) : (existing.role as UserRole);
    const promoteFromCustomer = existing.role === "CUSTOMER";
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: p.name || existing.name,
        phone: p.phone ?? existing.phone,
        role: promoteFromCustomer ? (p.role as UserRole) : nextRole,
        boltProfileId: existing.boltProfileId || (p.boltProfileId.startsWith("email:") ? null : p.boltProfileId),
        // Existing staff keep active/mustResetPassword; customers promoted stay invite-locked.
        ...(promoteFromCustomer
          ? { active: false, mustResetPassword: true, passwordHash: await unusableInviteHash() }
          : {}),
      },
    });
    byBolt.set(p.boltProfileId, user.id);
    updated += 1;
  }

  return { created, updated, byBolt };
}

async function applyPassengers(
  prisma: PrismaClient,
  planned: PlannedPassenger[],
  staffByBolt: Map<string, string>,
) {
  let created = 0;
  let updated = 0;

  for (const p of planned) {
    let profileUserId: string | null = null;
    if (p.boltProfileId) {
      profileUserId = staffByBolt.get(p.boltProfileId) || null;
      if (!profileUserId) {
        const linked = await prisma.user.findFirst({ where: { boltProfileId: p.boltProfileId } });
        profileUserId = linked?.id ?? null;
      }
    }
    if (!profileUserId && p.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: p.email } });
      profileUserId = byEmail?.id ?? null;
    }

    const existing = await prisma.passenger.findUnique({ where: { boltPassengerId: p.boltPassengerId } });
    const data = {
      boltFlightRequestId: p.boltFlightRequestId,
      name: p.name,
      email: p.email,
      phone: p.phone,
      weightLbs: p.weightLbs,
      notes: p.notes,
      address: p.address,
      passportNumber: p.passportNumber,
      passportExpirationDate: p.passportExpirationDate,
      nationality: p.nationality,
      dateOfBirth: p.dateOfBirth,
      responseStatus: p.responseStatus,
      profileUserId,
      boltCreatedAt: p.boltCreatedAt,
    };

    if (!existing) {
      await prisma.passenger.create({
        data: { boltPassengerId: p.boltPassengerId, ...data },
      });
      created += 1;
    } else {
      await prisma.passenger.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
    }
  }

  return { created, updated };
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const mode: Mode = args.apply ? "apply" : "dry-run";
  const flags: Flag[] = [];

  if (!existsSync(args.profilesPath)) {
    console.error(`Profiles CSV not found: ${args.profilesPath}`);
    process.exit(1);
  }
  if (!existsSync(args.passengersPath)) {
    console.error(`Passengers CSV not found: ${args.passengersPath}`);
    process.exit(1);
  }

  const profilesLabel = basename(args.profilesPath);
  const passengersLabel = basename(args.passengersPath);
  const profileRows = parseCsv(readFileSync(args.profilesPath, "utf8"));
  const passengerRows = parseCsv(readFileSync(args.passengersPath, "utf8"));

  const staff = planProfiles(profileRows, profilesLabel, flags);
  const passengers = planPassengers(passengerRows, passengersLabel, flags);

  const roleCounts: Record<string, number> = {};
  for (const s of staff) roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;

  console.log(`=== Flight Ops import (${mode}) ===`);
  console.log(`profiles    ${args.profilesPath}  rows=${profileRows.length}  planned=${staff.length}`);
  console.log(`passengers  ${args.passengersPath}  rows=${passengerRows.length}  planned=${passengers.length}`);
  console.log(`role map    ${Object.entries(roleCounts).map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
  console.log(
    "passwords   never invented — new seats = inactive invites (mustResetPassword=true, active=false)",
  );

  if (staff.length) {
    console.log("\n--- staff (sample up to 8) ---");
    for (const s of staff.slice(0, 8)) {
      console.log(
        `  ${s.email}  role=${s.role}  boltActive=${s.boltActive}  invite=inactive  boltProfileId=${s.boltProfileId}`,
      );
    }
    if (staff.length > 8) console.log(`  … +${staff.length - 8} more`);
  }

  if (passengers.length) {
    console.log("\n--- passengers (sample up to 5) ---");
    for (const p of passengers.slice(0, 5)) {
      console.log(
        `  ${p.name}  email=${p.email || "—"}  flight_request=${p.boltFlightRequestId || "—"}  weight=${p.weightLbs ?? "—"}`,
      );
    }
    if (passengers.length > 5) console.log(`  … +${passengers.length - 5} more`);
  }

  let staffCreated = 0;
  let staffUpdated = 0;
  let passCreated = 0;
  let passUpdated = 0;

  if (mode === "apply") {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is required for --apply");
      process.exit(1);
    }
    const prisma = new PrismaClient();
    try {
      const staffResult = await applyStaff(prisma, staff);
      staffCreated = staffResult.created;
      staffUpdated = staffResult.updated;
      const passResult = await applyPassengers(prisma, passengers, staffResult.byBolt);
      passCreated = passResult.created;
      passUpdated = passResult.updated;
    } finally {
      await prisma.$disconnect();
    }
  } else {
    staffCreated = staff.length;
    passCreated = passengers.length;
  }

  if (flags.length) {
    console.log(`\n--- flags (${flags.length}) ---`);
    for (const f of flags.slice(0, 30)) {
      console.log(`  ${f.file}:${f.row}  ${f.reason}`);
    }
    if (flags.length > 30) console.log(`  … +${flags.length - 30} more`);
  }

  console.log("\n=== counts ===");
  if (mode === "dry-run") {
    console.log(`staff                 planned=${staff.length}  (no write)`);
    console.log(`passengers            planned=${passengers.length}  (no write)`);
  } else {
    console.log(`staff                 created=${staffCreated}  updated=${staffUpdated}`);
    console.log(`passengers            created=${passCreated}  updated=${passUpdated}`);
  }
  console.log(`flags                 ${flags.length}`);
  console.log(
    mode === "dry-run"
      ? "Dry-run complete. Re-run with --apply after Hairson confirms (DATABASE_URL required)."
      : "Apply complete. Admin must set passwords in /ops/employees before imported seats can sign in.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
