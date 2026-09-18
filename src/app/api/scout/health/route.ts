import { NextResponse } from "next/server";
import { deployEnv, scoutAppUrl } from "@/lib/scout/config";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Kopvast Scout",
    env: deployEnv(),
    app: scoutAppUrl(),
  });
}
