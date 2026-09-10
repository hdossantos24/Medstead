import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { OpsBottomNav } from "@/components/ops-nav";
import { OpsLogout } from "@/components/ops-desk";
import { getOpsActor } from "@/lib/auth";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getOpsActor();
  const role = actor?.kind === "staff" ? actor.user.role : actor?.kind === "pin" ? "PIN" : "";
  const name = actor?.kind === "staff" ? actor.user.name.split(" ")[0] : actor ? "Ops" : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-navy-950 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white px-2 py-1">
              <Logo size="header" href="/ops" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Internal</p>
              <p className="text-sm font-semibold">{name ? `${name} · ops desk` : "Ops desk"}</p>
            </div>
          </div>
          {actor && <OpsLogout />}
        </div>
      </header>
      {children}
      {role && (
        <Suspense fallback={null}>
          <OpsBottomNav role={role} />
        </Suspense>
      )}
    </div>
  );
}
