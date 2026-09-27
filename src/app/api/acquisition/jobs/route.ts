import { NextResponse, type NextRequest } from "next/server";
import { processQueuedAcquisitionScans } from "@/lib/acquire";
import { processDueAutoFollowUps } from "@/lib/acquisition-send";
import { markDueNurtures, scheduleMissingAutoFollowUps } from "@/lib/acquisition/follow-up";
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
    runFollowUps(),
    markDueNurtures(20),
  ]);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    scheduledFollowUps: followUps.scheduled,
    followUps: followUps.sent,
    nurtureDue: nurtureDue.length,
  });
}

async function runFollowUps() {
  const scheduled = await scheduleMissingAutoFollowUps(20);
  const sent = await processDueAutoFollowUps(4);
  return { scheduled: scheduled.length, sent: sent.length };
}

export async function POST(request: NextRequest) {
  return GET(request);
}
