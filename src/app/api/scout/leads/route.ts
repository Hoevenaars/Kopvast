import { NextResponse, type NextRequest } from "next/server";
import { requireScoutUser, ScoutAuthError } from "@/lib/scout/auth";
import { originAllowed } from "@/lib/scout/config";
import { pushScoutLead } from "@/lib/scout/capture";
import { jsonError, safeErrorMessage } from "@/lib/scout/http";
import { inferSource } from "@/lib/scout/urls";
import { listLeads } from "@/lib/scout/leads";

function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && !originAllowed(origin)) {
    return jsonError("Ongeldige herkomst.", 403);
  }
  return null;
}

export async function GET() {
  try {
    const user = await requireScoutUser();
    const items = await listLeads(user.id);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const status = error instanceof ScoutAuthError ? error.status : 500;
    return jsonError(safeErrorMessage(error), status);
  }
}

export async function POST(request: NextRequest) {
  const blocked = checkOrigin(request);
  if (blocked) return blocked;
  try {
    const user = await requireScoutUser();
    const body = (await request.json()) as { website?: string; note?: string; email?: string; source?: string };
    const result = await pushScoutLead({
      user,
      website: body.website ?? "",
      note: body.note,
      email: body.email,
      source: inferSource({ source: body.source }),
    });
    const status = result.ok ? 200 : "duplicate" in result ? 409 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    const status = error instanceof ScoutAuthError ? error.status : 400;
    return jsonError(safeErrorMessage(error, "Lead opslaan is mislukt."), status);
  }
}
