import { NextResponse } from "next/server";
import { recordAcquisitionClick } from "@/lib/acquisition-clicks";
import { acquisitionChoiceUrls } from "@/lib/acquisition-start";

export const runtime = "nodejs";

function redirectTo(url: string) {
  return NextResponse.redirect(url, 307);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await recordAcquisitionClick({
    token,
    userAgent: request.headers.get("user-agent"),
    method: request.method,
  });
  return redirectTo(result.destination || acquisitionChoiceUrls().choiceAUrl);
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}
