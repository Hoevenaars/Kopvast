import { Section, Text } from "react-email";
import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { proposalMailCopy } from "@/emails/proposal-copy";

export type ProposalEmailProps = {
  name: string;
  organization: string;
  url: string;
  amount: string;
  testMode?: boolean;
};

export function ProposalEmail({ name, organization, url, amount, testMode = false }: ProposalEmailProps) {
  const copy = proposalMailCopy({ organization });
  return (
    <EmailShell preview={copy.preview} eyebrow={copy.eyebrow} title={copy.title}>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">{`Hallo ${name},`}</Text>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-olive">
        Hier is het voorstel van Kopvast. Scope, planning en investering staan in de beveiligde pagina.
      </Text>
      <Text className="mt-0 mb-[24px] text-[15px] leading-[24px] text-ink">{`Investering: ${amount} excl. btw.`}</Text>
      <Section>
        <EmailButton href={url}>Bekijk het voorstel</EmailButton>
      </Section>
      {testMode ? (
        <Text className="mt-[20px] mb-0 text-[12px] leading-[20px] text-olive">
          TEST: deze mail is intern afgeleverd.
        </Text>
      ) : null}
    </EmailShell>
  );
}

ProposalEmail.PreviewProps = {
  name: "Eva Linden",
  organization: "Ardea",
  url: "https://kopvast.nl/voorstel/voorbeeld",
  amount: "€ 4.800,00",
} satisfies ProposalEmailProps;

export default ProposalEmail;
