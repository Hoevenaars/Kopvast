import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { loadOnboardingFileForDownload } from "@/lib/onboarding-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Niet ingelogd." }, { status: 401 });
  const { id } = await params;
  const payload = await loadOnboardingFileForDownload(id);
  if (!payload) return NextResponse.json({ message: "Bestand niet gevonden." }, { status: 404 });
  if (session.role === "customer" && session.organizationId !== payload.file.organization_id) {
    return NextResponse.json({ message: "Geen toegang." }, { status: 403 });
  }
  return new NextResponse(new Uint8Array(payload.bytes), {
    headers: {
      "Content-Type": payload.file.mime_type,
      "Content-Disposition": `inline; filename="${payload.file.original_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
