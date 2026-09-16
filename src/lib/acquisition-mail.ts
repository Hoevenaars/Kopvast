import {
  buildAcquisitionPlainText,
  buildAcquisitionSubject,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  validateOfferParagraph,
  type AcquisitionOutreachEmailProps,
  type AcquisitionOutreachFinding,
} from "@/emails/acquisition-outreach";
import { FORBIDDEN_MAIL_CLAIMS, MAIL_PROMPT_VERSION, MAIL_TEMPLATE_VERSION, type ProductFit } from "./acquisition-constants";
import { OUTREACH_COPY_RULES, SPECIAL_OFFER_CLASSIFICATION_PROMPT } from "./acquisition/outreach-copy-rules";
import {
  buildSpecialOffer,
  isContentOfferReason,
  type OfferEvidence,
} from "./acquisition/special-offer-rules";
import {
  applyPlaceholders,
  acquisitionVars,
  defaultAcquisitionMailTemplate,
  loadAcquisitionMailTemplate,
  type AcquisitionMailTemplate,
} from "./mail-templates";

export type MailFinding = {
  id?: string;
  finding_type: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence?: number;
};

export type GeneratedAcquisitionMail = {
  subject: string;
  body: string;
  findingsUsed: MailFinding[];
  promptVersion: string;
  templateVersion: string;
  emailProps: AcquisitionOutreachEmailProps;
};

const CATEGORY_PRIORITY: Record<string, number> = {
  commercial: 1,
  visual: 2,
  trust: 3,
  conversion: 4,
  mobile: 5,
  content: 6,
  navigation: 7,
  seo: 8,
  performance: 9,
  accessibility: 10,
  technical: 11,
  complexity: 12,
};

const CATEGORY_TITLES: Record<string, string> = {
  commercial: "De diensten mogen duidelijker naar voren komen.",
  visual: "De eerste indruk kan sterker.",
  trust: "Het vertrouwen mag eerder voelbaar zijn.",
  conversion: "De route naar contact kan directer.",
  mobile: "Op mobiel verdwijnt de belangrijkste boodschap.",
  content: "Het verhaal mag scherper.",
  navigation: "De weg door de website kan eenvoudiger.",
};

const FORBIDDEN_COPY_PHRASES = [
  /onze scan toont/i,
  /onze ai[- ]?analyse/i,
  /de analyse laat zien/i,
  /digitale aanwezigheid/i,
  /online presentatie optimaliseren/i,
  /gebruikerservaring verbeteren/i,
  /naar een hoger niveau tillen/i,
  /online potentieel/i,
  /impact maximaliseren/i,
  /conversie optimaliseren/i,
  /biedt ruimte om/i,
  /vanaf\s*€?\s*995/i,
  /meer in zich/i,
  /online presentatie biedt ruimte/i,
  /optimaliseren/i,
];

const CUSTOM_FIT_PARAGRAPH =
  "De website lijkt commercieel interessant, maar de benodigde functionaliteit valt waarschijnlijk buiten het vaste websitepakket. Daarover denk ik graag een keer met jullie mee.";

function fill(text: string, vars: Record<string, string>) {
  return applyPlaceholders(text, vars);
}

export function selectableMailFindings(findings: MailFinding[]): MailFinding[] {
  return findings.filter((item) => item.finding_type !== "HYPOTHESIS");
}

export function pickMailFindings(findings: MailFinding[]): MailFinding[] {
  const usable = selectableMailFindings(findings);
  const ranked = [...usable].sort((a, b) => {
    const category = (item: MailFinding) => CATEGORY_PRIORITY[item.category] ?? 20;
    const severity = (item: MailFinding) =>
      item.severity === "critical" ? 3 : item.severity === "important" ? 2 : 1;
    const type = (item: MailFinding) => (item.finding_type === "FACT" ? 0.4 : item.finding_type === "OBSERVATION" ? 0.2 : 0);
    return category(a) - category(b) || severity(b) - severity(a) + type(b) - type(a);
  });

  const picked: MailFinding[] = [];
  for (const item of ranked) {
    if (picked.length >= 2) break;
    if (picked.some((existing) => existing.category === item.category)) continue;
    picked.push(item);
  }
  for (const item of ranked) {
    if (picked.length >= 2) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.slice(0, 2);
}

function stripForbiddenClaims(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(
      (sentence) =>
        !FORBIDDEN_MAIL_CLAIMS.some((pattern) => pattern.test(sentence)) &&
        !FORBIDDEN_COPY_PHRASES.some((pattern) => pattern.test(sentence))
    )
    .join(" ")
    .trim();
}

function oneSentence(text: string) {
  const cleaned = stripForbiddenClaims(text).replace(/\s+/g, " ").trim();
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return sentence.replace(/[.!?]+$/, ".") || sentence;
}

function looksLikeJargon(text: string) {
  return (
    /optimalisatie|merkbeleving|conversieoptimalisatie|potentieel maximaliseren|core web vitals|\blcp\b|digitale aanwezigheid|meer in zich/i.test(
      text
    ) || text.length > 72
  );
}

function humanFindingTitle(item: MailFinding) {
  const raw = item.title.replace(/\s+/g, " ").trim();
  if (raw && !looksLikeJargon(raw)) {
    return /[.!?]$/.test(raw) ? raw : `${raw.replace(/\.+$/, "")}.`;
  }
  return CATEGORY_TITLES[item.category] ?? "De uitstraling loopt achter op het bedrijf.";
}

function toOutreachFinding(item: MailFinding): AcquisitionOutreachFinding {
  const title = humanFindingTitle(item);
  let description = oneSentence(item.description || item.title);
  if (!description || description.replace(/\.+$/, "").toLowerCase() === title.replace(/\.+$/, "").toLowerCase()) {
    description =
      item.category === "conversion"
        ? "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is."
        : "Wat jullie onderscheidt komt nu nog te weinig naar voren.";
  }
  return { title, description };
}

function fallbackOpening(input: { companyName?: string | null; domain: string }) {
  const who = input.companyName?.trim() || input.domain;
  return `${who} heeft duidelijk meer karakter dan er nu online uitkomt.`;
}

function offerParagraphForFit(
  input: {
    fit: ProductFit;
    place?: string | null;
    municipality?: string | null;
    contentEvidence?: OfferEvidence[];
    allowLaunchOffer?: boolean;
  },
  template: AcquisitionMailTemplate,
  vars: Record<string, string>
) {
  if (input.fit === "CUSTOM_FIT") return fill(template.offerCustom, vars) || CUSTOM_FIT_PARAGRAPH;
  if (input.fit !== "STANDARD_FIT") {
    return "Een complete Kopvast Website kost €1.495 excl. btw.";
  }

  const offer = buildSpecialOffer({
    productFit: input.fit,
    place: input.place,
    municipality: input.municipality,
    contentEvidence: input.contentEvidence,
    allowLaunchOffer: input.allowLaunchOffer,
  });
  if (offer.eligible) {
    validateOfferParagraph(offer.offerParagraph);
    return offer.offerParagraph;
  }
  return "Een complete Kopvast Website kost €1.495 excl. btw.";
}

function twoFindings(input: {
  findings: MailFinding[];
  points?: string[];
  finding1?: AcquisitionOutreachFinding;
  finding2?: AcquisitionOutreachFinding;
}): [AcquisitionOutreachFinding, AcquisitionOutreachFinding] {
  if (input.finding1 && input.finding2) return [input.finding1, input.finding2];

  const picked = pickMailFindings(input.findings);
  const fromFindings = picked.map(toOutreachFinding);
  const fromPoints = (input.points ?? [])
    .map((text) => stripForbiddenClaims(String(text)))
    .filter(Boolean)
    .slice(0, 2)
    .map((text, index) => ({
      title: fromFindings[index]?.title ?? titleFromPoint(text),
      description: oneSentence(text),
    }));

  const combined = (fromPoints.length ? fromPoints : fromFindings).slice(0, 2);
  const first = combined[0] ?? {
    title: "De eerste indruk kan sterker.",
    description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
  };
  const second = combined[1] ?? {
    title: "De route naar contact kan directer.",
    description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
  };
  return [first, second];
}

function titleFromPoint(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  if (cleaned.length <= 72 && !looksLikeJargon(cleaned)) {
    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
  }
  return "De eerste indruk kan sterker.";
}

export type BuildOutreachMailInput = {
  companyName?: string | null;
  domain: string;
  place?: string | null;
  municipality?: string | null;
  productFit: ProductFit;
  openingObservation: string;
  finding1: AcquisitionOutreachFinding;
  finding2: AcquisitionOutreachFinding;
  contentEvidence?: OfferEvidence[];
  allowLaunchOffer?: boolean;
  choiceAUrl: string;
  choiceBUrl: string;
  unsubscribeUrl?: string | null;
};

export function buildOutreachEmailProps(input: {
  companyName?: string | null;
  domain: string;
  fit: ProductFit;
  findings: MailFinding[];
  opening?: string;
  openingObservation?: string;
  points?: string[];
  finding1?: AcquisitionOutreachFinding;
  finding2?: AcquisitionOutreachFinding;
  place?: string | null;
  municipality?: string | null;
  contentEvidence?: OfferEvidence[];
  allowLaunchOffer?: boolean;
  choiceAUrl?: string;
  choiceBUrl?: string;
  unsubscribeUrl?: string | null;
  template?: AcquisitionMailTemplate;
}): AcquisitionOutreachEmailProps {
  const template = input.template ?? defaultAcquisitionMailTemplate();
  const vars = acquisitionVars(input);
  const [finding1, finding2] = twoFindings(input);
  const openingObservation = stripForbiddenClaims(
    input.openingObservation || input.opening || fallbackOpening(input)
  );
  const specialOfferParagraph = offerParagraphForFit(
    {
      fit: input.fit,
      place: input.place,
      municipality: input.municipality,
      contentEvidence: input.contentEvidence,
      allowLaunchOffer: input.allowLaunchOffer,
    },
    template,
    vars
  );
  validateOfferParagraph(specialOfferParagraph);

  return {
    companyName: input.companyName,
    domain: input.domain,
    greeting: fill(template.greeting, vars) || "Goedendag,",
    signatureName: fill(template.signatureName, vars) || undefined,
    signatureTagline: fill(template.signatureTagline, vars) || undefined,
    openingObservation,
    finding1,
    finding2,
    specialOfferParagraph,
    choiceAUrl: input.choiceAUrl || DEFAULT_CHOICE_A_URL,
    choiceBUrl: input.choiceBUrl || DEFAULT_CHOICE_B_URL,
    unsubscribeUrl: input.unsubscribeUrl,
  };
}

export function buildOutreachMailData(input: BuildOutreachMailInput) {
  if (input.productFit !== "STANDARD_FIT") {
    throw new Error("Standard €995 outreach template is only allowed for STANDARD_FIT prospects.");
  }

  const offer = buildSpecialOffer({
    productFit: input.productFit,
    place: input.place,
    municipality: input.municipality,
    contentEvidence: input.contentEvidence,
    allowLaunchOffer: input.allowLaunchOffer,
  });

  if (!offer.eligible) {
    throw new Error("No valid special-offer reason available. Manual review required.");
  }

  const props: AcquisitionOutreachEmailProps = {
    companyName: input.companyName,
    domain: input.domain,
    openingObservation: input.openingObservation,
    finding1: input.finding1,
    finding2: input.finding2,
    specialOfferParagraph: offer.offerParagraph,
    choiceAUrl: input.choiceAUrl,
    choiceBUrl: input.choiceBUrl,
    unsubscribeUrl: input.unsubscribeUrl,
  };

  return {
    subject: buildAcquisitionSubject(input.domain),
    props,
    plainText: buildAcquisitionPlainText(props),
    offerMetadata: {
      normalPrice: offer.normalPrice,
      offerPrice: offer.offerPrice,
      geographicReason: offer.geographicReason,
      contentReason: offer.contentReason,
      reasonLines: offer.reasonLines,
    },
  };
}

export function composeAcquisitionBody(
  input: {
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
    opening?: string;
    points?: string[];
    finding1?: AcquisitionOutreachFinding;
    finding2?: AcquisitionOutreachFinding;
    place?: string | null;
    municipality?: string | null;
    contentEvidence?: OfferEvidence[];
    allowLaunchOffer?: boolean;
    choiceAUrl?: string;
    choiceBUrl?: string;
    unsubscribeUrl?: string | null;
  },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
): string {
  return buildAcquisitionPlainText(buildOutreachEmailProps({ ...input, template }));
}

export function chooseSubject(input: { companyName?: string | null; domain: string; findings?: MailFinding[] }) {
  return buildAcquisitionSubject(input.domain);
}

export function fallbackAcquisitionMail(
  input: {
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
    place?: string | null;
    municipality?: string | null;
    contentEvidence?: OfferEvidence[];
    allowLaunchOffer?: boolean;
  },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
): GeneratedAcquisitionMail {
  const used = pickMailFindings(input.findings);
  const emailProps = buildOutreachEmailProps({
    companyName: input.companyName,
    domain: input.domain,
    fit: input.fit,
    findings: used,
    place: input.place,
    municipality: input.municipality,
    contentEvidence: input.contentEvidence,
    allowLaunchOffer: input.allowLaunchOffer,
    template,
  });
  return {
    subject: buildAcquisitionSubject(input.domain),
    body: buildAcquisitionPlainText(emailProps),
    findingsUsed: used,
    promptVersion: MAIL_PROMPT_VERSION,
    templateVersion: MAIL_TEMPLATE_VERSION,
    emailProps,
  };
}

const MAIL_SYSTEM_PROMPT = `${OUTREACH_COPY_RULES}

${SPECIAL_OFFER_CLASSIFICATION_PROMPT}

Schrijf geen prijzen, geen korting en geen product-fit in opening of findings.
`;

function parseContentEvidence(raw: unknown): OfferEvidence[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const reason = String(row.reason ?? "");
    if (!isContentOfferReason(reason)) return [];
    const evidence = String(row.evidence ?? "").trim();
    const confidence = Number(row.confidence);
    if (!evidence || !Number.isFinite(confidence)) return [];
    return [
      {
        reason,
        evidence,
        confidence,
        sourceUrl: typeof row.sourceUrl === "string" ? row.sourceUrl : undefined,
      },
    ];
  });
}

function parseFinding(raw: unknown): AcquisitionOutreachFinding | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = stripForbiddenClaims(String(row.title ?? "")).trim();
  const description = stripForbiddenClaims(String(row.description ?? "")).trim();
  if (!title || !description) return null;
  return { title: oneSentence(title), description: oneSentence(description) };
}

export async function generateAcquisitionMail(input: {
  companyName?: string | null;
  domain: string;
  fit: ProductFit;
  findings: MailFinding[];
  model?: string;
  place?: string | null;
  municipality?: string | null;
  allowLaunchOffer?: boolean;
}): Promise<GeneratedAcquisitionMail> {
  const template = await loadAcquisitionMailTemplate();
  const fallback = fallbackAcquisitionMail(input, template);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const usable = pickMailFindings(input.findings);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: MAIL_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              domain: input.domain,
              company_name: input.companyName ?? null,
              place: input.place ?? null,
              findings: usable.map((item) => ({
                type: item.finding_type,
                category: item.category,
                title: item.title,
                description: item.description,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      console.error("[kopvast] Mailgeneratie-fout", response.status, await response.text());
      return fallback;
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content) as {
      openingObservation?: string;
      opening?: string;
      finding1?: unknown;
      finding2?: unknown;
      points?: string[];
      reasons?: unknown;
    };
    const finding1 = parseFinding(parsed.finding1);
    const finding2 = parseFinding(parsed.finding2);
    const points = Array.isArray(parsed.points)
      ? parsed.points.map((item) => stripForbiddenClaims(String(item))).filter(Boolean).slice(0, 2)
      : [];
    const opening = stripForbiddenClaims(String(parsed.openingObservation || parsed.opening || "")).trim();
    const emailProps = buildOutreachEmailProps({
      companyName: input.companyName,
      domain: input.domain,
      fit: input.fit,
      findings: usable,
      opening: opening || undefined,
      finding1: finding1 ?? undefined,
      finding2: finding2 ?? undefined,
      points: !finding1 && points.length ? points : undefined,
      place: input.place,
      municipality: input.municipality,
      contentEvidence: parseContentEvidence(parsed.reasons),
      allowLaunchOffer: input.allowLaunchOffer,
      template,
    });
    return {
      subject: buildAcquisitionSubject(input.domain),
      body: buildAcquisitionPlainText(emailProps),
      findingsUsed: usable,
      promptVersion: MAIL_PROMPT_VERSION,
      templateVersion: MAIL_TEMPLATE_VERSION,
      emailProps,
    };
  } catch (error) {
    console.error("[kopvast] Mailgeneratie mislukt", error instanceof Error ? error.message : error);
    return fallback;
  }
}

export { MAIL_PROMPT_VERSION, MAIL_TEMPLATE_VERSION };
