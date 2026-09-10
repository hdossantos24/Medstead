import { Suspense } from "react";
import Link from "next/link";
import { AuthTabs, LogoutButton } from "@/components/account-forms";
import { CopyAddress } from "@/components/copy-address";
import { Badge, Button, Card } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { SERVICE_LABEL, STATUS_LABEL, warehouseAddressFor } from "@/lib/constants";
import { homePathForRole, isStaffRole } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await currentUser();
  if (user && isStaffRole(user.role)) {
    redirect(homePathForRole(user.role));
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Account</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-navy-950">Sign in</h1>
        <p className="mt-3 text-navy-800/70">
          Create a free account to keep bookings and your Fort Lauderdale warehouse address.
        </p>
        <Card className="mt-8 p-6">
          <Suspense fallback={<p className="text-sm text-navy-800/60">Loading…</p>}>
            <AuthTabs initial="login" />
          </Suspense>
        </Card>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { OR: [{ userId: user.id }, { contactEmail: user.email }] },
    orderBy: { createdAt: "desc" },
  });
  const address = warehouseAddressFor(user.name);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Account</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-navy-950">{user.name}</h1>
          <p className="mt-2 text-navy-800/70">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/book">Book a shipment</Button>
          <LogoutButton />
        </div>
      </div>

      <Card className="mt-8 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
          Your US warehouse address
        </p>
        <p className="mt-3 text-sm leading-7 text-navy-950">{address}</p>
        <div className="mt-4">
          <CopyAddress text={address} />
        </div>
      </Card>

      <h2 className="mt-10 text-2xl font-semibold text-navy-950">Your bookings</h2>
      {bookings.length === 0 ? (
        <p className="mt-3 text-navy-800/65">No bookings yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {bookings.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold text-navy-950">{b.bookingCode}</p>
                  <p className="text-sm text-navy-800/60">
                    {b.originLabel} → {b.destLabel} · {SERVICE_LABEL[b.service]}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[b.status]}</Badge>
              </div>
              <Link
                href={`/track/${b.bookingCode}`}
                className="mt-3 inline-flex min-h-tap items-center text-sm font-semibold text-brand-blue hover:underline"
              >
                Track package
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
