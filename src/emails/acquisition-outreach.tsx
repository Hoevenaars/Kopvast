import { Body, Container, Head, Html, Link, Preview, Section, Text } from "react-email";
import { site } from "@/lib/site";

export type AcquisitionOutreachFinding = {
  title: string;
  description: string;
};

export type AcquisitionOutreachEmailProps = {
  companyName?: string | null;
  domain: string;
  greeting?: string;
  signatureName?: string;
  signatureTagline?: string;
  openingObservation?: string;
  finding1?: AcquisitionOutreachFinding;
  finding2?: AcquisitionOutreachFinding;
  specialOfferParagraph?: string;
  choiceAUrl?: string;
  choiceBUrl?: string;
  unsubscribeUrl?: string | null;
  subject?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export const DEFAULT_CHOICE_A_URL = `${site.url}/werkwijze`;
export const DEFAULT_CHOICE_B_URL = `${site.url}/websites`;

const DEFAULT_FINDING_1: AcquisitionOutreachFinding = {
  title: "De eerste indruk kan sterker.",
  description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
};

const DEFAULT_FINDING_2: AcquisitionOutreachFinding = {
  title: "De route naar contact kan directer.",
  description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
};

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
  choiceLink: {
    display: "block",
    marginBottom: "14px",
    color: "#121212",
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: "700",
    textDecoration: "underline",
    textDecorationColor: "#A64D27",
    textUnderlineOffset: "3px",
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

function firstUrl(value?: string): string | undefined {
  const match = value?.match(/https?:\/\/[^\s<>"]+/i);
  return match?.[0]?.replace(/[).,;]+$/, "");
}

export function parseOutreachBody(body: string, domain: string): Partial<AcquisitionOutreachEmailProps> {
  const blocks = body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const result: Partial<AcquisitionOutreachEmailProps> = { domain };

  const introIndex = blocks.findIndex((item) => /^Ik kwam .+ tegen en heb de website kort bekeken\.?$/i.test(item));
  const findingsIndex = blocks.findIndex((item) => /Twee dingen vielen direct op/i.test(item));
  const strongerIndex = blocks.findIndex((item) => /Daar kunnen we iets sterkers van maken/i.test(item));
  const choiceIndex = blocks.findIndex((item) => /Wat wil je eerst zien/i.test(item));

  if (introIndex >= 0 && findingsIndex > introIndex + 1) {
    result.openingObservation = blocks.slice(introIndex + 1, findingsIndex).join(" ");
  } else if (introIndex < 0 && findingsIndex > 0) {
    const opening = blocks.filter(
      (item) =>
        !/^KOPVAST$/i.test(item) &&
        !/^Goedendag,?$/i.test(item) &&
        blocks.indexOf(item) < findingsIndex
    );
    if (opening.length) result.openingObservation = opening[opening.length - 1];
  }

  if (findingsIndex >= 0) {
    const end =
      strongerIndex > findingsIndex ? strongerIndex : choiceIndex > findingsIndex ? choiceIndex : Math.min(blocks.length, findingsIndex + 3);
    const findingBlocks = blocks.slice(findingsIndex + 1, end);
    const parsed = findingBlocks.slice(0, 2).map((block) => {
      const [title, ...rest] = block.split("\n");
      return {
        title: (title ?? "").trim(),
        description: rest.join(" ").trim(),
      };
    });
    if (parsed[0]?.title) {
      result.finding1 = {
        title: parsed[0].title,
        description: parsed[0].description || parsed[0].title,
      };
    }
    if (parsed[1]?.title) {
      result.finding2 = {
        title: parsed[1].title,
        description: parsed[1].description || parsed[1].title,
      };
    }
  }

  const offerBlock = blocks.find(
    (item) => /€\s*1[.,]?495/.test(item) || /€\s*995/.test(item) || /buiten het vaste websitepakket/i.test(item)
  );
  if (offerBlock) result.specialOfferParagraph = offerBlock.replace(/\s+/g, " ").trim();

  const aIndex = blocks.findIndex((item) => /^A\s*[—–-]/.test(item));
  const bIndex = blocks.findIndex((item) => /^B\s*[—–-]/.test(item));
  if (aIndex >= 0) {
    const url = firstUrl(blocks[aIndex]) || firstUrl(blocks[aIndex + 1]);
    if (url) result.choiceAUrl = url;
  }
  if (bIndex >= 0) {
    const url = firstUrl(blocks[bIndex]) || firstUrl(blocks[bIndex + 1]);
    if (url) result.choiceBUrl = url;
  }

  const unsubIndex = blocks.findIndex((item) => /Geen berichten meer ontvangen/i.test(item));
  if (unsubIndex >= 0) {
    const url = firstUrl(blocks[unsubIndex]) || firstUrl(blocks[unsubIndex + 1]);
    if (url) result.unsubscribeUrl = url;
  }

  return result;
}

export function resolveAcquisitionOutreachProps(
  input: AcquisitionOutreachEmailProps
): Required<
  Pick<
    AcquisitionOutreachEmailProps,
    | "domain"
    | "greeting"
    | "signatureName"
    | "signatureTagline"
    | "openingObservation"
    | "finding1"
    | "finding2"
    | "specialOfferParagraph"
    | "choiceAUrl"
    | "choiceBUrl"
  >
> &
  Pick<AcquisitionOutreachEmailProps, "companyName" | "unsubscribeUrl"> {
  const parsed = input.body ? parseOutreachBody(input.body, input.domain) : {};
  const who = input.companyName?.trim() || input.domain;

  return {
    companyName: input.companyName,
    domain: input.domain,
    greeting: input.greeting?.trim() || "Goedendag,",
    signatureName: input.signatureName?.trim() || site.name,
    signatureTagline: input.signatureTagline?.trim() || site.tagline,
    openingObservation:
      input.openingObservation?.trim() ||
      parsed.openingObservation?.trim() ||
      `${who} heeft als website meer in zich dan er nu uitkomt.`,
    finding1: input.finding1 ?? parsed.finding1 ?? DEFAULT_FINDING_1,
    finding2: input.finding2 ?? parsed.finding2 ?? DEFAULT_FINDING_2,
    specialOfferParagraph:
      input.specialOfferParagraph?.trim() ||
      parsed.specialOfferParagraph?.trim() ||
      "Een complete Kopvast Website kost €1.495 excl. btw.",
    choiceAUrl: input.choiceAUrl || parsed.choiceAUrl || DEFAULT_CHOICE_A_URL,
    choiceBUrl: input.choiceBUrl || parsed.choiceBUrl || input.ctaHref || DEFAULT_CHOICE_B_URL,
    unsubscribeUrl: input.unsubscribeUrl ?? parsed.unsubscribeUrl,
  };
}

export function buildAcquisitionSubject(domain: string): string {
  return `Even gekeken naar ${domain}`;
}

export function buildAcquisitionPlainText(props: AcquisitionOutreachEmailProps): string {
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
  } = resolveAcquisitionOutreachProps(props);

  const lines = [
    "KOPVAST",
    "",
    greeting,
    "",
    `Ik kwam ${domain} tegen en heb de website kort bekeken.`,
    "",
    openingObservation,
    "",
    "Twee dingen vielen direct op:",
    "",
    finding1.title,
    finding1.description,
    "",
    finding2.title,
    finding2.description,
    "",
    "Daar kunnen we iets sterkers van maken.",
    "",
    specialOfferParagraph,
    "",
    "Wat wil je eerst zien?",
    "",
    "A — Laat zien hoe jullie dit zouden aanpakken:",
    choiceAUrl,
    "",
    "B — Vertel eerst concreet wat jullie zouden verbeteren:",
    choiceBUrl,
    "",
    "Je kunt ook gewoon op deze mail reageren met A of B.",
    "",
    signatureName,
    signatureTagline,
    "",
    site.email,
    site.url,
  ];

  if (unsubscribeUrl) {
    lines.push("", "Geen berichten meer ontvangen:", unsubscribeUrl);
  }

  return lines.join("\n");
}

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

          <Text style={styles.choiceIntro}>Wat wil je eerst zien?</Text>

          <Link href={choiceAUrl} style={styles.choiceLink}>
            A — Laat zien hoe jullie dit zouden aanpakken →
          </Link>

          <Link href={choiceBUrl} style={styles.choiceLink}>
            B — Vertel eerst concreet wat jullie zouden verbeteren →
          </Link>

          <Text style={styles.replyText}>Je kunt ook gewoon op deze mail reageren met A of B.</Text>

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
  companyName: "Kerkje van Persingen",
  domain: "kerkjepersingen.nl",
  openingObservation:
    "Kerkje van Persingen heeft als locatie veel karakter. Online komt dat nu minder sterk over dan volgens mij mogelijk is.",
  finding1: {
    title: "De locatie mag meer het werk doen.",
    description: "Het bijzondere karakter en de sfeer krijgen online nog weinig ruimte om echt te overtuigen.",
  },
  finding2: {
    title: "De route naar een aanvraag kan directer.",
    description: "Een bezoeker moet nu behoorlijk zoeken voordat duidelijk wordt wat de logische volgende stap is.",
  },
  specialOfferParagraph:
    "Een complete Kopvast Website kost normaal €1.495 excl. btw. Voor jullie maak ik daar €995 excl. btw. van. Binnen mijn eigen gemeente doe ik graag iets extra’s. Als er offline zoiets bijzonders staat, vind ik het zonde als dat online niet hetzelfde gevoel oproept.",
  choiceAUrl: DEFAULT_CHOICE_A_URL,
  choiceBUrl: DEFAULT_CHOICE_B_URL,
} satisfies AcquisitionOutreachEmailProps;

export default AcquisitionOutreachEmail;
