import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createLead({
    name: typeof body?.name === "string" ? body.name : "",
    email: typeof body?.email === "string" ? body.email : "",
    company: typeof body?.company === "string" ? body.company : "",
    website: typeof body?.website === "string" ? body.website : "",
    phone: typeof body?.phone === "string" ? body.phone : "",
    message: typeof body?.message === "string" ? body.message : "",
    source: typeof body?.source === "string" ? body.source : "aanvraag",
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
