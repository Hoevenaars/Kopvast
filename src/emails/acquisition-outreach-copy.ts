import {
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  acquisitionChoiceUrls,
  offerPriceFromParagraph,
} from "@/lib/acquisition-start";
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

export { DEFAULT_CHOICE_A_URL, DEFAULT_CHOICE_B_URL };

export const PROPOSAL_CTA_LABEL = "Ja, doe me een voorstel";
export const MORE_INFO_CTA_LABEL = "Stuur me eerst meer info";
export const CHOICE_INTRO = "Wat heeft jullie voorkeur?";
export const REPLY_HINT = 'Je kunt ook gewoon op deze mail reageren met "voorstel" of "meer info".';
export const DUPLICATE_EMAIL_CONTENT_ERROR = "Email rendering contains duplicated content.";
export const INVALID_OFFER_PARAGRAPH_ERROR =
  "Invalid acquisition offer paragraph: full email content detected.";

export const DEFAULT_FINDING_1: AcquisitionOutreachFinding = {
  title: "De eerste indruk kan sterker.",
  description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
};

export const DEFAULT_FINDING_2: AcquisitionOutreachFinding = {
  title: "De route naar contact kan directer.",
  description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
};

export const DEFAULT_OPENING_OBSERVATION = (who: string) =>
  `${who} heeft duidelijk meer karakter dan er nu online uitkomt.`;

export const STANDARD_PRICE_PARAGRAPH = "Een complete Kopvast Website kost €1.495 excl. btw.";

export type ResolvedAcquisitionOutreachProps = Required<
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
  Pick<AcquisitionOutreachEmailProps, "companyName" | "unsubscribeUrl" | "subject">;

function firstUrl(value?: string): string | undefined {
  const match = value?.match(/https?:\/\/[^\s<>"]+/i);
  return match?.[0]?.replace(/[).,;]+$/, "");
}

export function buildOfferParagraph(specialOfferReason: string) {
  return [
    "Een complete Kopvast Website kost normaal €1.495 excl. btw.",
    "Voor jullie maak ik daar €995 excl. btw. van.",
    specialOfferReason,
  ]
    .filter(Boolean)
    .join(" ");
}

export function validateOfferParagraph(value: string) {
  if (
    value.includes("KOPVAST") ||
    value.includes("Goedendag") ||
    value.includes("Wat heeft jullie voorkeur") ||
    value.includes("Wat wil je eerst zien") ||
    value.includes("Ik kwam ") ||
    value.includes("Twee dingen vielen direct op") ||
    value.length > 600
  ) {
    throw new Error(INVALID_OFFER_PARAGRAPH_ERROR);
  }
}

function isUsableOfferParagraph(value?: string | null): value is string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  try {
    validateOfferParagraph(trimmed);
    return true;
  } catch {
    return false;
  }
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sliceBeforeMarkers(value: string, markers: string[]) {
  let end = value.length;
  for (const marker of markers) {
    const index = value.indexOf(marker);
    if (index >= 0 && index < end) end = index;
  }
  return value.slice(0, end).trim();
}

export function extractOfferParagraph(text: string): string | undefined {
  const collapsed = collapseWhitespace(text);
  const customMatch = collapsed.match(
    /De website lijkt commercieel interessant[\s\S]*?(?:mee\.|Op aanvraag\.)/
  );
  if (customMatch && isUsableOfferParagraph(customMatch[0])) return customMatch[0].trim();

  const start = collapsed.search(/Een complete Kopvast Website kost(?: normaal)? €\s*1[.,]?495 excl\. btw\./);
  if (start < 0) return undefined;

  const fromOffer = sliceBeforeMarkers(collapsed.slice(start), [
    "Wat heeft jullie voorkeur",
    "Wat wil je eerst zien",
    PROPOSAL_CTA_LABEL,
    "A —",
    "A -",
    "Je kunt ook gewoon",
    "KOPVAST",
    "Goedendag",
    "Ik kwam ",
    "Twee dingen vielen direct op",
  ]);

  return isUsableOfferParagraph(fromOffer) ? fromOffer : undefined;
}

function urlAfterLabel(blocks: string[], label: RegExp): string | undefined {
  const index = blocks.findIndex((item) => label.test(item));
  if (index < 0) return undefined;
  return firstUrl(blocks[index]) || firstUrl(blocks[index + 1]);
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
  const choiceIndex = blocks.findIndex((item) => /Wat heeft jullie voorkeur|Wat wil je eerst zien/i.test(item));

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

  const extractedOffer = extractOfferParagraph(body);
  if (extractedOffer) result.specialOfferParagraph = extractedOffer;

  result.choiceAUrl = urlAfterLabel(blocks, /^(?:A\s*[—–-]|Ja, doe me een voorstel)/i);
  result.choiceBUrl = urlAfterLabel(blocks, /^(?:B\s*[—–-]|Stuur me eerst meer info)/i);

  const unsubIndex = blocks.findIndex((item) => /Geen berichten meer ontvangen/i.test(item));
  if (unsubIndex >= 0) {
    const url = firstUrl(blocks[unsubIndex]) || firstUrl(blocks[unsubIndex + 1]);
    if (url) result.unsubscribeUrl = url;
  }

  return result;
}

export function resolveAcquisitionOutreachProps(
  input: AcquisitionOutreachEmailProps
): ResolvedAcquisitionOutreachProps {
  const parsed = input.body ? parseOutreachBody(input.body, input.domain) : {};
  const who = input.companyName?.trim() || input.domain;
  const specialOfferParagraph = isUsableOfferParagraph(input.specialOfferParagraph)
    ? input.specialOfferParagraph.trim()
    : isUsableOfferParagraph(parsed.specialOfferParagraph)
      ? parsed.specialOfferParagraph.trim()
      : STANDARD_PRICE_PARAGRAPH;

  validateOfferParagraph(specialOfferParagraph);

  const defaults = acquisitionChoiceUrls({
    domain: input.domain,
    companyName: input.companyName,
    offerPrice: offerPriceFromParagraph(specialOfferParagraph),
  });
  const choiceAUrl = input.choiceAUrl || parsed.choiceAUrl || defaults.choiceAUrl;
  const choiceBUrl = input.choiceBUrl || parsed.choiceBUrl || input.ctaHref || defaults.choiceBUrl;
  if (!choiceAUrl || !choiceBUrl) {
    throw new Error("Acquisition CTAs require a real href.");
  }

  return {
    companyName: input.companyName,
    domain: input.domain,
    subject: input.subject,
    greeting: input.greeting?.trim() || "Goedendag,",
    signatureName: input.signatureName?.trim() || site.name,
    signatureTagline: input.signatureTagline?.trim() || site.tagline,
    openingObservation:
      input.openingObservation?.trim() ||
      parsed.openingObservation?.trim() ||
      DEFAULT_OPENING_OBSERVATION(who),
    finding1: input.finding1 ?? parsed.finding1 ?? DEFAULT_FINDING_1,
    finding2: input.finding2 ?? parsed.finding2 ?? DEFAULT_FINDING_2,
    specialOfferParagraph,
    choiceAUrl,
    choiceBUrl,
    unsubscribeUrl: input.unsubscribeUrl ?? parsed.unsubscribeUrl,
  };
}

export function emailPropsFromDraft(input: {
  domain: string;
  companyName?: string | null;
  subject?: string;
  body: string;
  choiceAUrl?: string;
  choiceBUrl?: string;
  unsubscribeUrl?: string | null;
}): ResolvedAcquisitionOutreachProps {
  return resolveAcquisitionOutreachProps({
    domain: input.domain,
    companyName: input.companyName,
    subject: input.subject,
    body: input.body,
    choiceAUrl: input.choiceAUrl,
    choiceBUrl: input.choiceBUrl,
    unsubscribeUrl: input.unsubscribeUrl,
  });
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

  const proposalUrl = choiceAUrl;
  const moreInfoUrl = choiceBUrl;

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
    CHOICE_INTRO,
    "",
    `${PROPOSAL_CTA_LABEL}:`,
    proposalUrl,
    "",
    `${MORE_INFO_CTA_LABEL}:`,
    moreInfoUrl,
    "",
    REPLY_HINT,
    "",
    signatureName,
    signatureTagline,
    "",
    site.email,
    new URL(site.url).hostname,
  ];

  if (unsubscribeUrl) {
    lines.push("", "Geen berichten meer ontvangen:", unsubscribeUrl);
  }

  return lines.join("\n");
}

export function visibleEmailTextFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function countPhrase(text: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(escaped, "g")) ?? []).length;
}

export function findDuplicatedAcquisitionContent(text: string): string | null {
  const normalized = collapseWhitespace(text);
  if (countPhrase(normalized, "KOPVAST") > 1) return DUPLICATE_EMAIL_CONTENT_ERROR;
  if (countPhrase(normalized, "Goedendag") > 1) return DUPLICATE_EMAIL_CONTENT_ERROR;
  if (countPhrase(normalized, "Twee dingen vielen direct op") > 1) return DUPLICATE_EMAIL_CONTENT_ERROR;
  if ((normalized.match(/Ik kwam .+? tegen en heb de website kort bekeken/gi) ?? []).length > 1) {
    return DUPLICATE_EMAIL_CONTENT_ERROR;
  }
  return null;
}

export function assertUniqueAcquisitionCopy(text: string) {
  const duplicated = findDuplicatedAcquisitionContent(text);
  if (duplicated) throw new Error(duplicated);
}

export function assertRenderableAcquisitionEmail(props: AcquisitionOutreachEmailProps) {
  const resolved = resolveAcquisitionOutreachProps(props);
  validateOfferParagraph(resolved.specialOfferParagraph);
  if (!resolved.choiceAUrl || !resolved.choiceBUrl) {
    throw new Error("Acquisition CTAs require a real href.");
  }
  const plainText = buildAcquisitionPlainText(resolved);
  assertUniqueAcquisitionCopy(plainText);
  return { emailProps: resolved, plainText };
}
