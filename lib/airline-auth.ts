import { NextRequest } from "next/server";
import { getOpsActor, actorAllows } from "./auth";
import { airlineTokenOk } from "./airline-seam";

export async function requireAirlineSeam(req: NextRequest) {
  const header = req.headers.get("authorization") || req.headers.get("x-airline-token");
  if (airlineTokenOk(header)) return { ok: true as const, via: "token" as const };
  const actor = await getOpsActor();
  if (actor && (await actorAllows(actor, "manage_schedule"))) {
    return { ok: true as const, via: "staff" as const };
  }
  return { ok: false as const, error: "Airline token or schedule-capable staff required." };
}
