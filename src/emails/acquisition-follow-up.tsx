import { Body, Button, Container, Head, Html, Link, Preview, Section, Text } from "react-email";
import { MORE_INFO_CTA_LABEL, PROPOSAL_CTA_LABEL } from "@/emails/acquisition-outreach-copy";
import { mailHasClosingSignature } from "@/lib/acquisition/follow-up-copy";
import { splitMailParagraphs } from "@/lib/mail-body";
import { site } from "@/lib/site";

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
  },
  signature: {
    margin: "28px 0 0",
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

function isProposalLine(value: string) {
  return value === PROPOSAL_CTA_LABEL || value.startsWith(`${PROPOSAL_CTA_LABEL}:`);
}

function isInfoLine(value: string) {
  return value === MORE_INFO_CTA_LABEL || value.startsWith(`${MORE_INFO_CTA_LABEL}:`);
}

export function AcquisitionFollowUpEmail({
  subject,
  body,
  choiceAUrl,
  choiceBUrl,
}: {
  subject?: string;
  body: string;
  choiceAUrl?: string | null;
  choiceBUrl?: string | null;
}) {
  const blocks = splitMailParagraphs(body).filter((item) => !/^KOPVAST$/i.test(item) && item !== site.name && item !== site.tagline);
  const showSignature = !mailHasClosingSignature(body);

  return (
    <Html lang="nl" dir="ltr">
      <Head>
        <meta content="light" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Body style={styles.body}>
        <Preview>{subject || "Nog even over jullie website"}</Preview>
        <Container style={styles.container}>
          <Text style={styles.logo}>KOPVAST</Text>
          {blocks.map((item, index) => {
            if (isProposalLine(item) && choiceAUrl) {
              return (
                <Section key={`a-${index}`} style={styles.ctaWrap}>
                  <Button href={choiceAUrl} style={styles.primaryButton}>
                    {PROPOSAL_CTA_LABEL}
                  </Button>
                </Section>
              );
            }
            if (isInfoLine(item) && choiceBUrl) {
              return (
                <Section key={`b-${index}`} style={styles.ctaWrap}>
                  <Button href={choiceBUrl} style={styles.secondaryButton}>
                    {MORE_INFO_CTA_LABEL}
                  </Button>
                </Section>
              );
            }
            if (isProposalLine(item) || isInfoLine(item)) return null;
            return (
              <Text key={`${index}-${item.slice(0, 24)}`} style={styles.paragraph}>
                {item}
              </Text>
            );
          })}
          {showSignature ? (
            <>
              <Text style={styles.signature}>{site.name}</Text>
              <Text style={styles.tagline}>{site.tagline}</Text>
            </>
          ) : null}
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

export default AcquisitionFollowUpEmail;
