import { PassengerDesk } from "@/components/passenger-desk";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Passengers · ops" };

export default async function PassengersPage() {
  await requireStaffPage(["ADMIN", "STAFF", "PILOT", "CARGO"]);

  const passengers = await prisma.passenger.findMany({
    include: {
      movement: {
        select: {
          id: true,
          movementCode: true,
          originCode: true,
          destCode: true,
          status: true,
          faStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Flight ops</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Passengers</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Imported passenger rows for the staff hive. Search and open the linked trip when present.
        Internal only — not a public ticket counter.
      </p>
      <div className="mt-8">
        <PassengerDesk passengers={passengers} />
      </div>
    </div>
  );
}
