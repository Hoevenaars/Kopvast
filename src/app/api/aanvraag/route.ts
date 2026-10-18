import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export const runtime = "nodejs";

function detailsFromBody(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const details: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") details[key] = item;
  }
  return details;
}

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
    details: detailsFromBody(body?.details),
    idempotencyKey: typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "",
  });

  if (!result.ok) {
    const unavailable = result.message.includes("opslaan lukt nu niet");
    return NextResponse.json({ message: result.message }, { status: unavailable ? 503 : 400 });
  }

  return NextResponse.json(result);
}
