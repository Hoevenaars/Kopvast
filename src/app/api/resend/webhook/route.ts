import { NextResponse } from "next/server";
import { Resend } from "resend";
import { updateEmailEventByResendId, webhookTypeToStatus } from "@/lib/email-log";
import { updateInboundEmailByResendId } from "@/lib/inbound";

export const runtime = "nodejs";

function emailIdFromEvent(event: { data?: unknown }): string | undefined {
  if (!event.data || typeof event.data !== "object" || !("email_id" in event.data)) {
    return undefined;
  }
  return typeof event.data.email_id === "string" ? event.data.email_id : undefined;
}

export async function POST(request: Request) {
  const payload = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;

  if (!secret || !apiKey) {
    console.error("[kopvast] Resend-webhook ontvangen zonder RESEND_WEBHOOK_SECRET of RESEND_API_KEY");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const resend = new Resend(apiKey);
  try {
    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
    const status = webhookTypeToStatus(event.type);
    const emailId = emailIdFromEvent(event);
    if (status && emailId) {
      await updateEmailEventByResendId(emailId, status);
      await updateInboundEmailByResendId(emailId, status);
      console.info("[kopvast] E-mailstatus bijgewerkt", { emailId, type: event.type, status });
    } else {
      console.info("[kopvast] Resend-webhook genegeerd", { type: event.type, emailId });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[kopvast] Ongeldige Resend-webhook", error);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
