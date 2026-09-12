import { Resend } from "resend";

export type LeadPayload = {
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  source: string;
};

export async function sendLeadNotification(lead: LeadPayload): Promise<{ delivered: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? "hello@kopvast.nl";
  const from = process.env.RESEND_FROM_EMAIL ?? "Kopvast <hello@kopvast.nl>";

  if (!apiKey) {
    console.info("[kopvast] Lead opgeslagen zonder e-mail (geen RESEND_API_KEY)", lead);
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: lead.email,
    subject: `Aanvraag van ${lead.name}${lead.company ? ` · ${lead.company}` : ""}`,
    text: [
      `Naam: ${lead.name}`,
      `E-mail: ${lead.email}`,
      `Bedrijf: ${lead.company || "—"}`,
      `Website: ${lead.website || "—"}`,
      `Bron: ${lead.source}`,
      "",
      lead.message || "Geen toelichting.",
    ].join("\n"),
  });

  if (error) {
    console.error("[kopvast] Resend-fout", error);
    throw new Error("De aanvraag is opgeslagen, maar de e-mail kon niet worden verstuurd.");
  }

  return { delivered: true, id: data?.id };
}
