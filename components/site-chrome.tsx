"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function SiteChrome({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const ops = pathname.startsWith("/ops");

  return (
    <>
      {ops ? null : <Header signedIn={signedIn} />}
      <main className={ops ? "pb-24" : "pb-16 lg:pb-0"}>{children}</main>
      {ops ? null : <Footer />}
      <MobileNav />
    </>
  );
}
