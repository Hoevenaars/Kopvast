import { EmailButton, EmailField, EmailShell, emailColors } from "@/emails/_components/email-shell";
import { notificationFields, notificationIntro, sourceLabel, type LeadEmailFields } from "@/emails/copy";
import { Section, Text } from "react-email";

export type LeadNotificationEmailProps = LeadEmailFields;

export function LeadNotificationEmail(lead: LeadNotificationEmailProps) {
  const fields = notificationFields(lead);
  const source = sourceLabel(lead.source);

  return (
    <EmailShell
      preview={`Nieuwe ${source} van ${lead.name}`}
      eyebrow="Nieuwe aanvraag"
      title={lead.company ? `${lead.name} · ${lead.company}` : `Aanvraag van ${lead.name}`}
    >
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-olive">{notificationIntro(lead)}</Text>
      <Section
        className="rounded-[16px] border border-solid px-[20px] py-[8px]"
        style={{ backgroundColor: emailColors.card, borderColor: emailColors.stone }}
      >
        {fields.map((field) => (
          <EmailField key={field.label} label={field.label} value={field.value} href={field.href} />
        ))}
      </Section>
      <Section className="pt-[24px]">
        <EmailButton href={`mailto:${lead.email}`}>Beantwoord {lead.name}</EmailButton>
      </Section>
    </EmailShell>
  );
}

LeadNotificationEmail.PreviewProps = {
  name: "Eva Linden",
  email: "eva@ardea.studio",
  phone: "06 1234 5678",
  company: "Ardea",
  website: "https://ardea.studio",
  source: "website-aanvraag",
  message: "We willen de website rustiger en consistenter maken.",
  details: {
    Merkstatus: "verouderd",
    "Pagina's": "Home, Over, Contact",
    Bestanden: "logo, foto",
  },
} satisfies LeadNotificationEmailProps;

export default LeadNotificationEmail;
