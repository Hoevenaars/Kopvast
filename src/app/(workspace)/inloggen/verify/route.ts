import { NextRequest, NextResponse } from "next/server";
import { consumeLoginToken } from "@/lib/auth";
import { destinationForRole, workspaceRoutes } from "@/lib/product";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = await consumeLoginToken(token);
  const target = session ? destinationForRole(session.role) : `${workspaceRoutes.login}?fout=1`;
  return NextResponse.redirect(new URL(target, request.url));
}
