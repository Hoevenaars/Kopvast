import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { Section, Text } from "react-email";
import { site } from "@/lib/site";

export type AcquisitionOutreachEmailProps = {
  subject: string;
  body: string;
  companyName?: string;
  domain: string;
  ctaLabel?: string;
  ctaHref?: string;
};

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AcquisitionOutreachEmail({
  subject,
  body,
  companyName,
  domain,
  ctaLabel = "Bekijk het websitepakket",
  ctaHref = `${site.url}/websites`,
}: AcquisitionOutreachEmailProps) {
  const blocks = paragraphs(body);
  const preview = blocks[1] || blocks[0] || subject;

  return (
    <EmailShell preview={preview.slice(0, 140)} eyebrow={companyName || domain} title={subject}>
      {blocks.map((block) => (
        <Text
          key={block.slice(0, 48)}
          className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {block}
        </Text>
      ))}
      <Section className="pt-[8px] pb-[8px]">
        <EmailButton href={ctaHref}>{ctaLabel}</EmailButton>
      </Section>
    </EmailShell>
  );
}

AcquisitionOutreachEmail.PreviewProps = {
  subject: "Een paar punten die opvielen aan nova-advies.nl",
  companyName: "Nova Advies",
  domain: "nova-advies.nl",
  body: [
    "Goedendag,",
    "Ik kwam jullie website tegen en heb er kort naar gekeken.",
    "Daarbij vielen een paar punten op die volgens mij sterker kunnen.",
    "De mobiele presentatie kan scherper.",
    "Er ligt ruimte om de route naar contact duidelijker te maken.",
    "Kopvast helpt bedrijven met professionele websites die helder laten zien waar een organisatie voor staat en bezoekers gericht naar contact leiden.",
    "Een complete Kopvast Website start vanaf €1.495 excl. btw.",
    "Met vriendelijke groet,\n\nKopvast\nScherp denken. Sterk uitvoeren.",
  ].join("\n\n"),
} satisfies AcquisitionOutreachEmailProps;

export default AcquisitionOutreachEmail;
