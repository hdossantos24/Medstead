/**
 * Create or promote the first admin without committing a password.
 *
 *   ADMIN_EMAIL=hdossantos@medsteadgroup.com ADMIN_PASSWORD='…' npm run db:seed-admin
 *
 * Existing CUSTOMER rows with that email are promoted. Password is only
 * overwritten when RESET_ADMIN_PASSWORD=1.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_RULES, PERMISSIONS, type StaffRole } from "../lib/staff";

const prisma = new PrismaClient();

async function ensureRules() {
  for (const role of Object.keys(DEFAULT_RULES) as StaffRole[]) {
    for (const key of PERMISSIONS) {
      await prisma.staffRule.upsert({
        where: { role_key: { role, key } },
        update: {},
        create: { role, key, allowed: DEFAULT_RULES[role].includes(key) },
      });
    }
  }
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment. Do not commit them.");
    console.error("Example: ADMIN_EMAIL=hdossantos@medsteadgroup.com ADMIN_PASSWORD='…' npm run db:seed-admin");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await ensureRules();

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 10);
  const reset = process.env.RESET_ADMIN_PASSWORD === "1";

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME?.trim() || "Hairson",
        passwordHash,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`Created admin ${email}`);
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: "ADMIN",
      active: true,
      ...(reset || existing.role === "CUSTOMER" ? { passwordHash } : {}),
    },
  });
  console.log(
    existing.role === "CUSTOMER"
      ? `Promoted ${email} from customer to admin`
      : `Ensured admin seat for ${email}${reset ? " (password reset)" : ""}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
