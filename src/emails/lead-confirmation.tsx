import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { confirmationCopy } from "@/emails/copy";
import { Section, Text } from "react-email";

export type LeadConfirmationEmailProps = {
  name: string;
  source: string;
  copy?: ReturnType<typeof confirmationCopy>;
};

export function LeadConfirmationEmail({ name, source, copy }: LeadConfirmationEmailProps) {
  const resolved = copy ?? confirmationCopy(source);

  return (
    <EmailShell preview={resolved.preview} eyebrow={resolved.eyebrow} title={resolved.title}>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">{`Hallo ${name},`}</Text>
      <Text className="mt-0 mb-[24px] text-[15px] leading-[24px] text-olive">{resolved.text}</Text>
      <Section>
        <EmailButton href={resolved.ctaHref}>{resolved.ctaLabel}</EmailButton>
      </Section>
    </EmailShell>
  );
}

LeadConfirmationEmail.PreviewProps = {
  name: "Eva Linden",
  source: "website-aanvraag",
} satisfies LeadConfirmationEmailProps;

export default LeadConfirmationEmail;
