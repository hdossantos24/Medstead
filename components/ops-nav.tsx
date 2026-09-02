"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = { href: string; label: string; match: (path: string, lane: string | null) => boolean };

const ADMIN_TABS: Tab[] = [
  { href: "/ops", label: "Home", match: (p) => p === "/ops" },
  { href: "/ops/orders", label: "Orders", match: (p, lane) => p.startsWith("/ops/orders") && lane !== "cargo" },
  { href: "/ops/trips", label: "Board", match: (p) => p.startsWith("/ops/trips") },
  { href: "/ops/employees", label: "People", match: (p) => p.startsWith("/ops/employees") },
];

const STAFF_TABS: Tab[] = [
  { href: "/ops", label: "Home", match: (p) => p === "/ops" },
  { href: "/ops/orders", label: "Orders", match: (p) => p.startsWith("/ops/orders") },
  { href: "/ops/assignments", label: "Next", match: (p) => p.startsWith("/ops/assignments") },
];

const CARGO_TABS: Tab[] = [
  { href: "/ops", label: "Home", match: (p) => p === "/ops" },
  { href: "/ops/orders?lane=cargo", label: "Warehouse", match: (p, lane) => p.startsWith("/ops/orders") && lane === "cargo" },
  { href: "/ops/trips", label: "Board", match: (p) => p.startsWith("/ops/trips") },
];

const PILOT_TABS: Tab[] = [
  { href: "/ops/assignments", label: "Next", match: (p) => p.startsWith("/ops/assignments") || p === "/ops" },
  { href: "/ops/trips", label: "Board", match: (p) => p.startsWith("/ops/trips") },
];

const PIN_TABS: Tab[] = [
  { href: "/ops", label: "Home", match: (p) => p === "/ops" },
  { href: "/ops/orders", label: "Orders", match: (p) => p.startsWith("/ops/orders") },
];

export function OpsBottomNav({ role }: { role: string }) {
  const path = usePathname();
  const lane = useSearchParams().get("lane");
  const tabs =
    role === "ADMIN"
      ? ADMIN_TABS
      : role === "CARGO"
        ? CARGO_TABS
        : role === "PILOT"
          ? PILOT_TABS
          : role === "PIN"
            ? PIN_TABS
            : STAFF_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const on = tab.match(path, lane);
          return (
            <li key={tab.href + tab.label}>
              <Link
                href={tab.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  on ? "text-forest-700" : "text-navy-800/55"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-forest-600" : "bg-transparent"}`} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
