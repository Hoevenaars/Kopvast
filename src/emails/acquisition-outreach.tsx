import { Body, Button, Container, Head, Html, Link, Preview, Section, Text } from "react-email";
import { site } from "@/lib/site";
import {
  CHOICE_INTRO,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  MORE_INFO_CTA_LABEL,
  PROPOSAL_CTA_LABEL,
  REPLY_HINT,
  resolveAcquisitionOutreachProps,
  type AcquisitionOutreachEmailProps,
} from "@/emails/acquisition-outreach-copy";

export type {
  AcquisitionOutreachEmailProps,
  AcquisitionOutreachFinding,
  ResolvedAcquisitionOutreachProps,
} from "@/emails/acquisition-outreach-copy";

export {
  assertRenderableAcquisitionEmail,
  assertUniqueAcquisitionCopy,
  buildAcquisitionPlainText,
  buildAcquisitionSubject,
  buildOfferParagraph,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  DUPLICATE_EMAIL_CONTENT_ERROR,
  emailPropsFromDraft,
  extractOfferParagraph,
  findDuplicatedAcquisitionContent,
  MORE_INFO_CTA_LABEL,
  parseOutreachBody,
  PROPOSAL_CTA_LABEL,
  resolveAcquisitionOutreachProps,
  validateOfferParagraph,
  visibleEmailTextFromHtml,
} from "@/emails/acquisition-outreach-copy";

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
  intro: {
    margin: "0 0 26px",
    color: "#242424",
    fontSize: "15px",
    lineHeight: "24px",
  },
  sectionLabel: {
    margin: "26px 0 16px",
    color: "#121212",
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: "600",
  },
  finding: {
    marginBottom: "20px",
  },
  findingTitle: {
    margin: "0 0 3px",
    color: "#121212",
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: "700",
  },
  findingDescription: {
    margin: "0",
    color: "#4d4d4d",
    fontSize: "14px",
    lineHeight: "22px",
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

export function AcquisitionOutreachEmail(input: AcquisitionOutreachEmailProps) {
  const {
    domain,
    greeting,
    signatureName,
    signatureTagline,
    openingObservation,
    finding1,
    finding2,
    specialOfferParagraph,
    choiceAUrl,
    choiceBUrl,
    unsubscribeUrl,
  } = resolveAcquisitionOutreachProps(input);

  const proposalUrl = choiceAUrl;
  const moreInfoUrl = choiceBUrl;

  return (
    <Html lang="nl" dir="ltr">
      <Head>
        <meta content="light" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Body style={styles.body}>
        <Preview>{`Even gekeken naar ${domain}`}</Preview>
        <Container style={styles.container}>
          <Text style={styles.logo}>KOPVAST</Text>

          <Text style={styles.paragraph}>{greeting}</Text>

          <Text style={styles.intro}>{`Ik kwam ${domain} tegen en heb de website kort bekeken.`}</Text>

          <Text style={styles.intro}>{openingObservation}</Text>

          <Text style={styles.sectionLabel}>Twee dingen vielen direct op:</Text>

          <Section style={styles.finding}>
            <Text style={styles.findingTitle}>{finding1.title}</Text>
            <Text style={styles.findingDescription}>{finding1.description}</Text>
          </Section>

          <Section style={styles.finding}>
            <Text style={styles.findingTitle}>{finding2.title}</Text>
            <Text style={styles.findingDescription}>{finding2.description}</Text>
          </Section>

          <Text style={styles.paragraph}>Daar kunnen we iets sterkers van maken.</Text>

          <Section style={styles.offer}>
            <Text style={styles.offerText}>{specialOfferParagraph}</Text>
          </Section>

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

          <Text style={styles.signature}>{signatureName}</Text>
          <Text style={styles.tagline}>{signatureTagline}</Text>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>{site.email}</Text>
            <Text style={styles.footerText}>
              <Link href={site.url} style={styles.footerLink}>
                kopvast.nl
              </Link>
            </Text>
            {unsubscribeUrl ? (
              <Text style={styles.footerText}>
                Geen berichten meer ontvangen?{" "}
                <Link href={unsubscribeUrl} style={styles.footerLink}>
                  Afmelden
                </Link>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AcquisitionOutreachEmail.PreviewProps = {
  companyName: "Fluweel Events",
  domain: "fluweelevents.nl",
  openingObservation: "Fluweel Events heeft duidelijk meer karakter dan er nu online uitkomt.",
  finding1: {
    title: "De eerste indruk kan sterker.",
    description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
  },
  finding2: {
    title: "De route naar contact kan directer.",
    description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
  },
  specialOfferParagraph:
    "Een complete Kopvast Website kost normaal €1.495 excl. btw. Voor jullie maak ik daar €995 excl. btw. van. Als Groesbekers onder elkaar doe je dat voor elkaar.",
  choiceAUrl: DEFAULT_CHOICE_A_URL,
  choiceBUrl: DEFAULT_CHOICE_B_URL,
} satisfies AcquisitionOutreachEmailProps;

export default AcquisitionOutreachEmail;
