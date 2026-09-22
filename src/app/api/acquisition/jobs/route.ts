import { NextResponse, type NextRequest } from "next/server";
import { processQueuedAcquisitionScans } from "@/lib/acquire";
import { processDueAutoFollowUps } from "@/lib/acquisition-send";
import { markDueNurtures } from "@/lib/acquisition/follow-up";
import { scoutCronSecret } from "@/lib/scout/config";
import { jsonError } from "@/lib/scout/http";

function authorized(request: NextRequest) {
  const secret = scoutCronSecret();
  const header = request.headers.get("authorization") ?? "";
  if (secret && header === `Bearer ${secret}`) return true;
  if (process.env.NODE_ENV !== "production" && !secret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return jsonError("Forbidden", 403);
  const [results, followUps, nurtureDue] = await Promise.all([
    processQueuedAcquisitionScans(4),
    processDueAutoFollowUps(4),
    markDueNurtures(20),
  ]);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    followUps: followUps.length,
    nurtureDue: nurtureDue.length,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
