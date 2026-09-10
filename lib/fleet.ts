import { prisma } from "./prisma";

/** Current MedStead fleet tails — seed if missing. Internal ops only. */
export const FLEET_TAILS = [
  { tailNumber: "N127TX", label: "N127TX", typeName: null as string | null, notes: "Current fleet" },
  { tailNumber: "N275RC", label: "N275RC", typeName: null as string | null, notes: "Current fleet" },
  { tailNumber: "N3710W", label: "N3710W", typeName: null as string | null, notes: "Current fleet" },
] as const;

export async function ensureFleetAircraft() {
  for (const row of FLEET_TAILS) {
    await prisma.aircraft.upsert({
      where: { tailNumber: row.tailNumber },
      update: { active: true, label: row.label },
      create: {
        tailNumber: row.tailNumber,
        label: row.label,
        typeName: row.typeName,
        notes: row.notes,
        active: true,
      },
    });
  }
  return prisma.aircraft.findMany({
    where: { active: true },
    orderBy: { tailNumber: "asc" },
  });
}
