import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { confirmationCopy } from "@/emails/copy";
import { Section, Text } from "react-email";

export type LeadConfirmationEmailProps = {
  name: string;
  source: string;
};

export function LeadConfirmationEmail({ name, source }: LeadConfirmationEmailProps) {
  const copy = confirmationCopy(source);

  return (
    <EmailShell preview={copy.preview} eyebrow={copy.eyebrow} title={copy.title}>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">{`Hallo ${name},`}</Text>
      <Text className="mt-0 mb-[24px] text-[15px] leading-[24px] text-olive">{copy.text}</Text>
      <Section>
        <EmailButton href={copy.ctaHref}>{copy.ctaLabel}</EmailButton>
      </Section>
    </EmailShell>
  );
}

LeadConfirmationEmail.PreviewProps = {
  name: "Eva Linden",
  source: "website-aanvraag",
} satisfies LeadConfirmationEmailProps;

export default LeadConfirmationEmail;
