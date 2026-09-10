import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteChrome } from "@/components/site-chrome";
import { currentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "MedStead — Book freight",
    template: "%s · MedStead",
  },
  description:
    "Book Express Air, Standard Sea, and hard-to-reach medical transport. Invoice / pay later. Track from Fort Lauderdale to destination.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <SiteChrome signedIn={Boolean(user && user.role === "CUSTOMER")}>{children}</SiteChrome>
      </body>
    </html>
  );
}
