import { Resend } from "resend";
import { logEmailEvent } from "@/lib/email-log";
import { logInboundEmail, type InboundEmailKind } from "@/lib/inbound";
import { site } from "@/lib/site";

export type LeadPayload = {
  id: string;
  inboundId?: string;
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  source: string;
  phone?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function fromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || `Kopvast <${site.email}>`;
}

function notifyAddress() {
  return process.env.CONTACT_TO_EMAIL?.trim() || site.email;
}

function isSandboxFrom(from: string) {
  return from.toLowerCase().includes("resend.dev");
}

function confirmationCopy(source: string) {
  if (source === "maatwerk") {
    return {
      subject: "Kopvast heeft je idee ontvangen",
      text: "We hebben je maatwerkvraag ontvangen. We beoordelen wat nodig is en nemen contact met je op. Dit is nog geen opdracht en geen vaste prijs.",
    };
  }
  return {
    subject: "Kopvast heeft je aanvraag ontvangen",
    text: "We hebben je aanvraag voor Kopvast Website ontvangen. Je hoort van ons over de volgende stap. Stilte behandelen we niet als akkoord of opdracht.",
  };
}

async function recordEmail(event: {
  leadId: string;
  inboundId?: string;
  kind: "aanvraag-notify" | "aanvraag-bevestiging";
  inboundKind: InboundEmailKind;
  to: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  resendId?: string;
  error?: string;
}) {
  await logEmailEvent({
    leadId: event.leadId,
    resendId: event.resendId,
    kind: event.kind,
    to: event.to,
    subject: event.subject,
    status: event.status,
    error: event.error,
  });
  await logInboundEmail({
    leadId: event.inboundId,
    kind: event.inboundKind,
    to: event.to,
    subject: event.subject,
    status: event.status,
    resendId: event.resendId,
    error: event.error,
  });
}

export async function sendLeadNotification(lead: LeadPayload): Promise<{ delivered: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = notifyAddress();
  const from = fromAddress();

  if (!apiKey) {
    console.info("[kopvast] Lead opgeslagen zonder e-mail (geen RESEND_API_KEY)", {
      id: lead.id,
      email: lead.email,
      source: lead.source,
    });
    await recordEmail({
      leadId: lead.id,
      inboundId: lead.inboundId,
      kind: "aanvraag-notify",
      inboundKind: "internal_notification",
      to,
      subject: `Aanvraag van ${lead.name}`,
      status: "failed",
      error: "RESEND_API_KEY ontbreekt",
    });
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  const details = [
    `Naam: ${lead.name}`,
    `E-mail: ${lead.email}`,
    `Telefoon: ${lead.phone || "—"}`,
    `Bedrijf: ${lead.company || "—"}`,
    `Website: ${lead.website || "—"}`,
    `Bron: ${lead.source}`,
    "",
    lead.message || "Geen toelichting.",
  ].join("\n");

  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      replyTo: lead.email,
      subject: `Aanvraag van ${lead.name}${lead.company ? ` · ${lead.company}` : ""}`,
      text: details,
      html: `<pre style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(details)}</pre>`,
    },
    { idempotencyKey: `aanvraag-notify/${lead.id}` }
  );

  await recordEmail({
    leadId: lead.id,
    inboundId: lead.inboundId,
    kind: "aanvraag-notify",
    inboundKind: "internal_notification",
    to,
    subject: `Aanvraag van ${lead.name}`,
    status: error ? "failed" : "sent",
    resendId: data?.id,
    error: error?.message,
  });

  if (error) {
    console.error("[kopvast] Resend-fout bij interne melding", error);
    return { delivered: false };
  }

  if (isSandboxFrom(from)) {
    console.info("[kopvast] Klantbevestiging overgeslagen (Resend-sandbox kan alleen naar het accountadres)");
    return { delivered: true, id: data?.id };
  }

  const confirm = confirmationCopy(lead.source);
  const { data: confirmData, error: confirmError } = await resend.emails.send(
    {
      from,
      to: lead.email,
      replyTo: to,
      subject: confirm.subject,
      text: [`Hallo ${lead.name},`, "", confirm.text, "", "Kopvast", site.tagline].join("\n"),
      html: `<p>Hallo ${escapeHtml(lead.name)},</p><p>${escapeHtml(confirm.text)}</p><p>Kopvast<br/>${escapeHtml(site.tagline)}</p>`,
    },
    { idempotencyKey: `aanvraag-bevestiging/${lead.id}` }
  );
  await recordEmail({
    leadId: lead.id,
    inboundId: lead.inboundId,
    kind: "aanvraag-bevestiging",
    inboundKind: "customer_confirmation",
    to: lead.email,
    subject: confirm.subject,
    status: confirmError ? "failed" : "sent",
    resendId: confirmData?.id,
    error: confirmError?.message,
  });
  if (confirmError) {
    console.error("[kopvast] Resend-fout bij klantbevestiging", confirmError);
  }

  return { delivered: true, id: data?.id };
}
