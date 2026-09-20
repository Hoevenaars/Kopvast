import { Body, Button, Container, Head, Html, Link, Preview, Section, Text } from "react-email";
import { site } from "@/lib/site";
import {
  CHOICE_INTRO,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  MORE_INFO_CTA_LABEL,
  PROPOSAL_CTA_LABEL,
  REPLY_HINT,
} from "@/emails/acquisition-outreach-copy";
import { splitMailParagraphs } from "@/lib/mail-body";

const styles = {
  body: {
    backgroundColor: "#ffffff",
    margin: "0",
    padding: "0",
    color: "#121212",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
  container: {
    width: "100%",
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px 20px 36px",
  },
  logo: {
    margin: "0 0 30px",
    color: "#121212",
    fontSize: "19px",
    lineHeight: "24px",
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },
  paragraph: {
    margin: "0 0 18px",
    color: "#242424",
    fontSize: "15px",
    lineHeight: "24px",
  },
  offer: {
    margin: "30px 0",
    paddingTop: "24px",
    paddingBottom: "24px",
    borderTop: "1px solid #dedbd4",
    borderBottom: "1px solid #dedbd4",
  },
  offerText: {
    margin: "0",
    color: "#121212",
    fontSize: "15px",
    lineHeight: "24px",
  },
  choiceIntro: {
    margin: "28px 0 16px",
    color: "#121212",
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: "700",
  },
  ctaWrap: {
    margin: "0 0 12px",
  },
  primaryButton: {
    backgroundColor: "#121212",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "4px",
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-block",
    boxSizing: "border-box" as const,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#121212",
    border: "1px solid #121212",
    padding: "12px 18px",
    borderRadius: "4px",
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-block",
    boxSizing: "border-box" as const,
  },
  replyText: {
    margin: "24px 0 30px",
    color: "#4d4d4d",
    fontSize: "14px",
    lineHeight: "22px",
  },
  signature: {
    margin: "0",
    color: "#121212",
    fontSize: "14px",
    lineHeight: "21px",
  },
  tagline: {
    margin: "2px 0 0",
    color: "#6b6b6b",
    fontSize: "13px",
    lineHeight: "20px",
  },
  footer: {
    marginTop: "32px",
    paddingTop: "20px",
    borderTop: "1px solid #ece9e3",
  },
  footerText: {
    margin: "0 0 3px",
    color: "#777777",
    fontSize: "11px",
    lineHeight: "18px",
  },
  footerLink: {
    color: "#5A604C",
    textDecoration: "underline",
  },
} as const;

function firstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s<>"]+/i);
  return match?.[0]?.replace(/[).,;]+$/, "");
}

export function AcquisitionUnreachableEmail({
  domain,
  subject,
  body,
}: {
  domain: string;
  subject?: string;
  body: string;
}) {
  const blocks = splitMailParagraphs(body);
  const proposalUrl = firstUrl(blocks.find((item) => item.includes(PROPOSAL_CTA_LABEL)) ?? "") || DEFAULT_CHOICE_A_URL;
  const moreInfoUrl = firstUrl(blocks.find((item) => item.includes(MORE_INFO_CTA_LABEL)) ?? "") || DEFAULT_CHOICE_B_URL;
  const skip = new Set(
    blocks.filter(
      (item) =>
        /^KOPVAST$/i.test(item) ||
        item === site.name ||
        item === site.tagline ||
        item === site.email ||
        item === CHOICE_INTRO ||
        item === REPLY_HINT ||
        item.startsWith(`${PROPOSAL_CTA_LABEL}`) ||
        item.startsWith(`${MORE_INFO_CTA_LABEL}`) ||
        item === proposalUrl ||
        item === moreInfoUrl
    )
  );
  const offerIndex = blocks.findIndex((item) => /complete Kopvast Website kost/i.test(item));
  const visible = blocks.filter((item, index) => {
    if (skip.has(item)) return false;
    if (index === offerIndex) return false;
    return true;
  });
  const offer = offerIndex >= 0 ? blocks[offerIndex] : null;

  return (
    <Html lang="nl" dir="ltr">
      <Head>
        <meta content="light" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Body style={styles.body}>
        <Preview>{subject || `De website van ${domain} is nu niet bereikbaar`}</Preview>
        <Container style={styles.container}>
          <Text style={styles.logo}>KOPVAST</Text>
          {visible.map((item) => (
            <Text key={item} style={styles.paragraph}>
              {item}
            </Text>
          ))}
          {offer ? (
            <Section style={styles.offer}>
              <Text style={styles.offerText}>{offer}</Text>
            </Section>
          ) : null}
          <Text style={styles.choiceIntro}>{CHOICE_INTRO}</Text>
          <Section style={styles.ctaWrap}>
            <Button href={proposalUrl} style={styles.primaryButton}>
              {PROPOSAL_CTA_LABEL}
            </Button>
          </Section>
          <Section style={styles.ctaWrap}>
            <Button href={moreInfoUrl} style={styles.secondaryButton}>
              {MORE_INFO_CTA_LABEL}
            </Button>
          </Section>
          <Text style={styles.replyText}>{REPLY_HINT}</Text>
          <Text style={styles.signature}>{site.name}</Text>
          <Text style={styles.tagline}>{site.tagline}</Text>
          <Section style={styles.footer}>
            <Text style={styles.footerText}>{site.email}</Text>
            <Text style={styles.footerText}>
              <Link href={site.url} style={styles.footerLink}>
                kopvast.nl
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AcquisitionUnreachableEmail.PreviewProps = {
  domain: "atelierlint.nl",
  subject: "De website van atelierlint.nl is nu niet bereikbaar",
  body: [
    "Goedendag,",
    "Ik kwam atelierlint.nl tegen, maar de website was niet bereikbaar.",
    "Als klanten Atelier Lint nu zoeken, komen ze nergens terecht. Ik help ondernemers om zo'n site weer op te zetten: helder, bereikbaar en klaar voor contact.",
    "Een complete Kopvast Website kost €1.495 excl. btw.",
  ].join("\n\n"),
};

export default AcquisitionUnreachableEmail;
