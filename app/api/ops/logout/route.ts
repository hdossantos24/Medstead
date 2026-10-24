import { NextResponse } from "next/server";
import { clearOpsCookie, clearUserCookie, currentStaff } from "@/lib/auth";

export async function POST() {
  const staff = await currentStaff();
  await clearOpsCookie();
  if (staff) await clearUserCookie();
  return NextResponse.json({ ok: true });
}
