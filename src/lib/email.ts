import { Resend } from "resend";

export type LeadPayload = {
  id: string;
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  source: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendLeadNotification(lead: LeadPayload): Promise<{ delivered: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? "nhoevenaars@gmail.com";
  const from = process.env.RESEND_FROM_EMAIL ?? "Kopvast <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[kopvast] Lead opgeslagen zonder e-mail (geen RESEND_API_KEY)", {
      id: lead.id,
      email: lead.email,
    });
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  const details = [
    `Naam: ${lead.name}`,
    `E-mail: ${lead.email}`,
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

  if (error) {
    console.error("[kopvast] Resend-fout bij interne melding", error);
    return { delivered: false };
  }

  const sandbox = from.toLowerCase().includes("resend.dev");
  if (!sandbox) {
    const { error: confirmError } = await resend.emails.send(
      {
        from,
        to: lead.email,
        replyTo: to,
        subject: "Kopvast heeft je aanvraag ontvangen",
        text: [
          `Hallo ${lead.name},`,
          "",
          "We hebben je aanvraag ontvangen en nemen contact met je op via dit e-mailadres.",
          "Stilte behandelen we niet als akkoord of opdracht.",
          "",
          "Kopvast",
          "Scherp denken. Sterk uitvoeren.",
        ].join("\n"),
        html: `<p>Hallo ${escapeHtml(lead.name)},</p><p>We hebben je aanvraag ontvangen en nemen contact met je op via dit e-mailadres. Stilte behandelen we niet als akkoord of opdracht.</p><p>Kopvast<br/>Scherp denken. Sterk uitvoeren.</p>`,
      },
      { idempotencyKey: `aanvraag-bevestiging/${lead.id}` }
    );
    if (confirmError) {
      console.error("[kopvast] Resend-fout bij klantbevestiging", confirmError);
    }
  }

  return { delivered: true, id: data?.id };
}
