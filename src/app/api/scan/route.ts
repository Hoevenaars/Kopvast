import { after, NextResponse } from "next/server";
import { acquireScan } from "@/lib/acquire";
import { scanWebsite } from "@/lib/scan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  const result = await scanWebsite(url);

  after(() =>
    acquireScan(result, url).catch((error) => {
      console.error("[kopvast] Acquire na /api/scan mislukt", error);
    })
  );

  const status =
    result.status === "ok" ? 200 : result.status === "invalid" || result.status === "blocked" ? 400 : 422;

  return NextResponse.json(result, { status });
}
