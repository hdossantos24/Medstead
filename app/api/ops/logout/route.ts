import { NextResponse } from "next/server";
import { clearOpsCookie, clearUserCookie, currentStaff } from "@/lib/auth";

export async function POST() {
  const staff = await currentStaff();
  clearOpsCookie();
  if (staff) clearUserCookie();
  return NextResponse.json({ ok: true });
}
