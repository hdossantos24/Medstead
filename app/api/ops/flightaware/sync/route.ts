import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireOpsApi } from "@/lib/auth";
import { flightAwareConfigured } from "@/lib/flightaware";
import { syncMovementFromFlightAware, syncOpenMovementsFromFlightAware } from "@/lib/flightaware-sync";

function cronOk(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.FLIGHTAWARE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const offered = bearer || req.headers.get("x-cron-secret") || "";
  if (!offered) return false;
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const isCron = cronOk(req);
  if (!isCron) {
    const gate = await requireOpsApi("manage_schedule");
    if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await req.json().catch(() => ({}))) as { movementId?: string };
  const configured = flightAwareConfigured();

  if (body.movementId) {
    const result = await syncMovementFromFlightAware(body.movementId);
    return NextResponse.json({ ok: result.ok, configured, results: [result] });
  }

  const results = await syncOpenMovementsFromFlightAware();
  return NextResponse.json({
    ok: true,
    configured,
    synced: results.length,
    results,
  });
}

export async function GET(req: NextRequest) {
  // Vercel Cron GETs this path. Prefer Authorization: Bearer CRON_SECRET.
  const isCron = cronOk(req);
  const vercelCron = Boolean(req.headers.get("x-vercel-cron"));
  if (isCron || vercelCron) {
    const results = await syncOpenMovementsFromFlightAware();
    return NextResponse.json({
      ok: true,
      configured: flightAwareConfigured(),
      synced: results.length,
      results,
      via: isCron ? "secret" : "vercel-cron",
    });
  }
  const gate = await requireOpsApi("view_trips");
  if (!gate.actor) return NextResponse.json({ error: gate.error }, { status: gate.status });
  return NextResponse.json({
    ok: true,
    configured: flightAwareConfigured(),
    hint: "POST to sync. Set FLIGHTAWARE_API_KEY in Vercel. Cron uses CRON_SECRET or x-vercel-cron.",
  });
}
