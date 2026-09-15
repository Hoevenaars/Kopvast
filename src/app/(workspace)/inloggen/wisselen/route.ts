import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";

export async function POST(request: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL(`${workspaceRoutes.login}?wissel=1`, request.url));
}
