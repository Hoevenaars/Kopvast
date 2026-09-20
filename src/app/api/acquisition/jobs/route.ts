import { NextResponse, type NextRequest } from "next/server";
import { processQueuedAcquisitionScans } from "@/lib/acquire";
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
  const results = await processQueuedAcquisitionScans(4);
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
