import { formatPrice, getAcquisitionOffer, getProduct } from "@/lib/products";
import { products, site } from "@/lib/site";
import { FORBIDDEN_MAIL_CLAIMS, type ProductFit } from "@/lib/acquisition-constants";
import {
  buildSpecialOffer,
  isApproachSourceKind,
  isContentOfferReason,
  isGeographicOfferReason,
  selectPersonalApproach,
  type ApproachSourceKind,
  type ContentOfferReason,
  type GeographicOfferReason,
  type OfferEvidence,
  type PersonalApproachSelection,
  type WebsitePresence,
} from "@/lib/acquisition/special-offer-rules";

export const PERSONAL_APPROACH_TITLE = "Spelregels persoonlijke benadering";

export const PERSONAL_APPROACH_INTRO =
  "Twee aparte beslissingen. Eerst de persoonlijke aanleiding: waarom Kopvast deze organisatie benadert. Later, alleen als de commerciële situatie daarom vraagt, het speciale aanbod. Een aanleiding zet nooit vanzelf een korting in de eerste mail.";

export const PERSONAL_APPROACH_MAIL_RULES = [
  "De eerste acquisitiemail is kort, persoonlijk en menselijk. Richtlijn: 80 tot 120 woorden, met één eenvoudige vraag.",
  "Gebruik één controleerbare aanleiding in de opening. Geen prijs, geen korting en geen pakketoverzicht.",
  "Schrijf alsof je de website zelf kort hebt bekeken wanneer die er is. Zonder website claim je nooit dat je een website hebt bekeken.",
  "Geen AI, scan, algoritme of opportunity score noemen. Geen reden verzinnen, en geen maatschappelijke rol of bedrijfsgrootte aannemen.",
  "Onderwerp bij een website: Even gekeken naar [domein]. Zonder website geen onderwerp dat een blik op een site suggereert.",
] as const;

const listPrice = formatPrice(getProduct("website_standard")?.priceExVat);
const offerPrice = formatPrice(getAcquisitionOffer("regional_acquisition_offer")?.offerPriceExVat);

export const PERSONAL_APPROACH_DISCOUNT_RULES = [
  `Alleen bij een standaard website-fit. Maatwerk of geen fit krijgt geen automatische ${offerPrice}.`,
  `Normale prijs blijft ${listPrice} excl. btw. De korting is ${offerPrice} excl. btw — nooit “vanaf ${offerPrice}”.`,
  "Geografisch, in deze volgorde: Groesbeek, eigen gemeente Berg en Dal, regio Nijmegen.",
  "Inhoudelijk alleen met hard bewijs van de website: erfgoed, lokale bijdrage, toerisme, cultuur, sterke Kopvast-case, lokaal ondernemerschap of een kleine sterke organisatie.",
  "Maximaal één geografische en één inhoudelijke reden. Geen reden verzinnen. Zonder reden geen automatische korting.",
  "Een persoonlijke aanleiding zet de korting niet automatisch in de eerste mail. €995 en de standaardprijs blijven beschikbaar wanneer de commerciële situatie daarom vraagt.",
] as const;

export const APPROACH_SOURCE_LABELS: Record<ApproachSourceKind, string> = {
  website: "Website",
  manual_note: "Handmatige notitie",
  project_description: "Projectbeschrijving",
  company_profile: "Bedrijfsprofiel",
  facebook: "Facebook",
};

const INTERNAL_ACQUISITION_INSTRUCTION =
  /verzin ik niet|controleerbare aanleiding|geen website om na te kijken|opening daarop worden aangevuld|interne instructie/i;

export function containsInternalAcquisitionInstruction(value: string) {
  return INTERNAL_ACQUISITION_INSTRUCTION.test(value);
}

const FACT_BLOCKLIST = [
  ...FORBIDDEN_MAIL_CLAIMS,
  /€/,
  /\b995\b/,
  /1[.,]495/,
  /korting/i,
  /websitepakket/i,
  /digitale aanwezigheid/i,
  /optimaliseren/i,
  /opportunity score/i,
  /\bscan\b/i,
  /algoritme/i,
];

const CONTENT_OPENING_LINE: Record<Exclude<ContentOfferReason, null>, string> = {
  LOCAL_CONTRIBUTION:
    "Jullie voegen zichtbaar iets toe aan de omgeving. Die bijdrage is de reden dat ik persoonlijk contact zoek.",
  HERITAGE_SPECIAL_PLACE:
    "Dit is een bijzondere of historische plek. Dat karakter is de reden dat ik persoonlijk contact zoek.",
  SMALL_STRONG_ORGANISATION:
    "Dit is een kleine organisatie met een sterk verhaal. Dat verhaal is de reden dat ik persoonlijk contact zoek.",
  LOCAL_ENTREPRENEURSHIP:
    "Jullie zijn een lokaal gewortelde ondernemer. Die binding is de reden dat ik persoonlijk contact zoek.",
  STRONG_KOPVAST_CASE:
    "Dit past sterk bij het werk dat ik met Kopvast wil laten zien. Dat is de reden dat ik persoonlijk contact zoek.",
  REGIONAL_TOURISM:
    "Jullie dragen bij aan toerisme of recreatie in de regio. Die rol is de reden dat ik persoonlijk contact zoek.",
  CULTURE_OR_HISTORY:
    "Jullie hebben een culturele of historische functie. Die functie is de reden dat ik persoonlijk contact zoek.",
};

const GEOGRAPHIC_OPENING: Record<Exclude<GeographicOfferReason, null>, (who: string) => string> = {
  GROESBEEK: (who) =>
    `${who} zit in Groesbeek. Ik ben daar zelf gevestigd en schrijf organisaties om de hoek het liefst zelf. Deze mail komt daarom van mij, en niet uit een algemene adressenlijst.`,
  BERG_EN_DAL: (who) =>
    `${who} zit in mijn eigen gemeente Berg en Dal. Ik schrijf organisaties daar het liefst zelf. Deze mail komt daarom van mij, en niet uit een algemene adressenlijst.`,
  REGION_NIJMEGEN: (who) =>
    `${who} zit in de regio Nijmegen. Ik zoek daar bewust contact met organisaties die bij de streek horen. Deze mail komt daarom van mij, en niet uit een algemene adressenlijst.`,
};

const BRIDGE =
  "Ik zoek contact vanuit Kopvast omdat ik organisaties help hun verhaal online net zo helder te maken als het in het echt al is. Dat doe ik alleen als ik kan aanwijzen waarom ik juist jullie schrijf. In deze eerste mail vraag ik daar één ding over.";

const QUESTION = "Zal ik een keer kort laten zien wat mij daarin opvalt?";

export type PersonalApproachLetter = PersonalApproachSelection & {
  opening: string;
  subject: string;
  body: string;
};

export type StoredPersonalApproach = {
  geographicReason: GeographicOfferReason;
  contentReason: ContentOfferReason;
  evidence: string | null;
  sourceUrl: string | null;
  sourceKind: ApproachSourceKind | null;
  websitePresence: WebsitePresence;
  opening: string;
};

function whoForLetter(input: { companyName?: string | null; domain?: string | null; websitePresence: WebsitePresence }) {
  const company = input.companyName?.trim();
  if (company) return company;
  if (input.websitePresence === "HAS_WEBSITE" && input.domain?.trim()) return input.domain.trim();
  return "jullie organisatie";
}

function firstSentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return sentence.trim();
}

function clipWords(value: string, max: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ").replace(/[.,;:]+$/, "")}.`;
}

function mailSafeFact(evidence: string | null) {
  if (!evidence?.trim()) return null;
  const sentence = firstSentence(evidence);
  if (!sentence || FACT_BLOCKLIST.some((pattern) => pattern.test(sentence))) return null;
  return clipWords(sentence, 24);
}

function neutralOpening(who: string, websitePresence: WebsitePresence) {
  if (websitePresence === "NO_WEBSITE") {
    return `Ik kwam ${who} tegen. Jullie hebben nog geen eigen website. Dit is een korte kennismaking, zonder aannames over wat ik niet zelf heb gezien.`;
  }
  return `Ik kwam ${who} tegen. Dit is een korte kennismaking. Ik schrijf zonder aannames over rol, omvang of wat ik nog niet heb kunnen controleren.`;
}

export function personalApproachOpening(input: {
  companyName?: string | null;
  domain?: string | null;
  selection: PersonalApproachSelection;
}) {
  const who = whoForLetter({ ...input, websitePresence: input.selection.websitePresence });
  if (input.selection.openingAxis === "content" && input.selection.contentReason) {
    const fact = mailSafeFact(input.selection.evidence);
    const line = CONTENT_OPENING_LINE[input.selection.contentReason];
    return fact ? `${who}. ${fact} ${line}` : `${who}. ${line}`;
  }
  if (input.selection.openingAxis === "geographic" && input.selection.geographicReason) {
    return GEOGRAPHIC_OPENING[input.selection.geographicReason](who);
  }
  return neutralOpening(who, input.selection.websitePresence);
}

export function personalApproachSubject(input: {
  companyName?: string | null;
  domain?: string | null;
  websitePresence: WebsitePresence;
}) {
  if (input.websitePresence === "NO_WEBSITE") {
    const who = input.companyName?.trim();
    return who ? `Even contact over ${who}` : "Even contact";
  }
  return `Even gekeken naar ${input.domain?.trim() || "jullie domein"}`;
}

export function personalMailWordCount(body: string) {
  const kept = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && line !== site.name && line !== site.tagline);
  return kept.join(" ").split(/\s+/).filter(Boolean).length;
}

export function approachSourceLabel(input: {
  sourceKind: ApproachSourceKind | null;
  sourceUrl?: string | null;
  openingAxis: PersonalApproachSelection["openingAxis"];
}) {
  if (input.sourceUrl?.trim()) return input.sourceUrl.trim();
  if (input.sourceKind) return APPROACH_SOURCE_LABELS[input.sourceKind];
  if (input.openingAxis === "geographic") return "Plaats op de prospect";
  return "Geen bron beschikbaar";
}

export function buildPersonalApproachLetter(input: {
  companyName?: string | null;
  domain?: string | null;
  place?: string | null;
  municipality?: string | null;
  contentEvidence?: OfferEvidence[];
  manualReasons?: {
    geographicReason: GeographicOfferReason;
    contentReason: ContentOfferReason;
  };
  websitePresence?: WebsitePresence;
  greeting?: string;
  signatureName?: string;
  signatureTagline?: string;
  openingOverride?: string | null;
}): PersonalApproachLetter {
  const selection = selectPersonalApproach(input);
  const opening =
    input.openingOverride?.trim() ||
    personalApproachOpening({
      companyName: input.companyName,
      domain: input.domain,
      selection,
    });
  const greeting = input.greeting?.trim() || "Goedendag,";
  const signatureName = input.signatureName?.trim() || site.name;
  const signatureTagline = input.signatureTagline?.trim() || site.tagline;
  const subject = personalApproachSubject({
    companyName: input.companyName,
    domain: input.domain,
    websitePresence: selection.websitePresence,
  });
  const body = [greeting, "", opening, "", BRIDGE, "", QUESTION, "", signatureName, signatureTagline].join("\n");
  return { ...selection, opening, subject, body };
}

export function replacePersonalOpening(body: string, previousOpening: string, nextOpening: string) {
  const next = nextOpening.trim();
  const previous = previousOpening.trim();
  if (previous && body.includes(previous)) return body.replace(previous, next);
  const parts = body.split(/\n{2,}/);
  if (parts.length >= 2 && /^(goedendag|beste)\b/i.test(parts[0]?.trim() ?? "")) {
    parts[1] = next;
    return parts.join("\n\n");
  }
  return `${next}\n\n${body}`;
}

export function parseStoredPersonalApproach(metadata: unknown): StoredPersonalApproach | null {
  if (!metadata || typeof metadata !== "object") return null;
  const wrapper = metadata as Record<string, unknown>;
  const raw = wrapper.approach && typeof wrapper.approach === "object" ? wrapper.approach : metadata;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const geographicRaw =
    row.geographicReason == null || row.geographicReason === "null" ? null : String(row.geographicReason);
  const contentRaw = row.contentReason == null || row.contentReason === "null" ? null : String(row.contentReason);
  if (geographicRaw && !isGeographicOfferReason(geographicRaw)) return null;
  if (contentRaw && !isContentOfferReason(contentRaw)) return null;
  const geographicReason = geographicRaw && isGeographicOfferReason(geographicRaw) ? geographicRaw : null;
  const contentReason = contentRaw && isContentOfferReason(contentRaw) ? contentRaw : null;
  const sourceRaw = typeof row.sourceKind === "string" ? row.sourceKind : "";
  const websitePresence = row.websitePresence === "NO_WEBSITE" ? "NO_WEBSITE" : "HAS_WEBSITE";
  const opening = typeof row.opening === "string" ? row.opening.trim() : "";
  if (!opening) return null;
  return {
    geographicReason,
    contentReason,
    evidence: typeof row.evidence === "string" && row.evidence.trim() ? row.evidence.trim() : null,
    sourceUrl: typeof row.sourceUrl === "string" && row.sourceUrl.trim() ? row.sourceUrl.trim() : null,
    sourceKind: isApproachSourceKind(sourceRaw) ? sourceRaw : null,
    websitePresence,
    opening,
  };
}

export function latestStoredPersonalApproach(
  activities: Array<{ event_type: string; created_at: string; metadata: unknown }>
) {
  const relevant = activities
    .filter((item) => item.event_type === "MAIL_GENERATED" || item.event_type === "MAIL_EDITED")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const item of relevant) {
    const stored = parseStoredPersonalApproach(item.metadata);
    if (stored) return stored;
  }
  return null;
}

export function letterFromStoredApproach(input: {
  companyName?: string | null;
  domain?: string | null;
  place?: string | null;
  municipality?: string | null;
  stored: StoredPersonalApproach;
  greeting?: string;
  signatureName?: string;
  signatureTagline?: string;
}) {
  const evidence =
    input.stored.contentReason && input.stored.evidence
      ? [
          {
            reason: input.stored.contentReason,
            evidence: input.stored.evidence,
            confidence: 1,
            sourceUrl: input.stored.sourceUrl ?? undefined,
            sourceKind: input.stored.sourceKind ?? undefined,
          },
        ]
      : [];
  return buildPersonalApproachLetter({
    companyName: input.companyName,
    domain: input.domain,
    place: input.place,
    municipality: input.municipality,
    websitePresence: input.stored.websitePresence,
    manualReasons: {
      geographicReason: input.stored.geographicReason,
      contentReason: input.stored.contentReason,
    },
    contentEvidence: evidence,
    greeting: input.greeting,
    signatureName: input.signatureName,
    signatureTagline: input.signatureTagline,
    openingOverride: input.stored.opening,
  });
}

export function personalApproachForProspect(input: {
  companyName?: string | null;
  domain: string;
  place?: string | null;
  municipality?: string | null;
  websiteUrl?: string | null;
  activities?: Array<{ event_type: string; created_at: string; metadata: unknown }>;
  greeting?: string;
  signatureName?: string;
  signatureTagline?: string;
}) {
  const websitePresence: WebsitePresence = input.websiteUrl?.trim() ? "HAS_WEBSITE" : "NO_WEBSITE";
  const stored = input.activities ? latestStoredPersonalApproach(input.activities) : null;
  if (stored) {
    return letterFromStoredApproach({ ...input, stored: { ...stored, websitePresence: stored.websitePresence || websitePresence } });
  }
  return buildPersonalApproachLetter({
    companyName: input.companyName,
    domain: input.domain,
    place: input.place,
    municipality: input.municipality,
    websitePresence,
    greeting: input.greeting,
    signatureName: input.signatureName,
    signatureTagline: input.signatureTagline,
  });
}

export function serializePersonalApproach(letter: Pick<
  PersonalApproachLetter,
  | "geographicReason"
  | "contentReason"
  | "evidence"
  | "sourceUrl"
  | "sourceKind"
  | "websitePresence"
  | "opening"
>): StoredPersonalApproach {
  return {
    geographicReason: letter.geographicReason,
    contentReason: letter.contentReason,
    evidence: letter.evidence,
    sourceUrl: letter.sourceUrl,
    sourceKind: letter.sourceKind,
    websitePresence: letter.websitePresence,
    opening: letter.opening,
  };
}

export const GEOGRAPHIC_REASON_LABELS: Record<Exclude<GeographicOfferReason, null>, string> = {
  GROESBEEK: "Groesbeek",
  BERG_EN_DAL: "Eigen gemeente Berg en Dal",
  REGION_NIJMEGEN: "Regio Nijmegen",
};

export const CONTENT_REASON_LABELS: Record<Exclude<ContentOfferReason, null>, string> = {
  LOCAL_CONTRIBUTION: "Lokale of maatschappelijke bijdrage",
  HERITAGE_SPECIAL_PLACE: "Bijzondere of historische plek",
  SMALL_STRONG_ORGANISATION: "Kleine organisatie met een sterk verhaal",
  LOCAL_ENTREPRENEURSHIP: "Lokaal gewortelde ondernemer",
  STRONG_KOPVAST_CASE: "Sterke Kopvast-case",
  REGIONAL_TOURISM: "Toerisme of recreatie in de regio",
  CULTURE_OR_HISTORY: "Cultuur, historie of erfgoed",
};

export type OutreachOfferView = {
  title: string;
  text: string;
  price: string | null;
  eligible: boolean;
  reasonLines: string[];
  reasonLabels: string[];
  city: string | null;
};

export function explainOutreachOffer(input: {
  fit: ProductFit | null;
  place?: string | null;
  municipality?: string | null;
  contentEvidence?: OfferEvidence[];
  allowLaunchOffer?: boolean;
}): OutreachOfferView {
  const city = input.place?.trim() || null;

  if (!input.fit) {
    return {
      title: "Aanbod",
      text: "Nog geen product-fit. Na de scan volgt het aanbod volgens de spelregels.",
      price: null,
      eligible: false,
      reasonLines: [],
      reasonLabels: [],
      city,
    };
  }

  if (input.fit === "CUSTOM_FIT") {
    return {
      title: "Kopvast Maatwerk",
      text: "De website lijkt commercieel interessant, maar de benodigde functionaliteit valt waarschijnlijk buiten het vaste websitepakket.",
      price: "Op aanvraag",
      eligible: false,
      reasonLines: [],
      reasonLabels: [],
      city,
    };
  }

  if (input.fit === "NOT_FIT") {
    return {
      title: "Geen standaard fit",
      text: "Deze website lijkt niet bij het Kopvast-aanbod te passen. Er wordt geen automatische prijs of korting voorgesteld.",
      price: null,
      eligible: false,
      reasonLines: [],
      reasonLabels: [],
      city,
    };
  }

  if (input.fit === "REVIEW_REQUIRED") {
    return {
      title: "Beoordeling nodig",
      text: "Er is nog te weinig zekerheid voor een automatisch aanbod. Jij mag alsnog mailen: een website kan altijd scherper.",
      price: null,
      eligible: false,
      reasonLines: [],
      reasonLabels: [],
      city,
    };
  }

  const offer = buildSpecialOffer({
    productFit: input.fit,
    place: input.place,
    municipality: input.municipality,
    contentEvidence: input.contentEvidence,
    allowLaunchOffer: input.allowLaunchOffer,
  });

  const reasonLabels = [
    offer.geographicReason ? GEOGRAPHIC_REASON_LABELS[offer.geographicReason] : null,
    offer.contentReason ? CONTENT_REASON_LABELS[offer.contentReason] : null,
  ].filter((item): item is string => Boolean(item));

  if (offer.eligible) {
    return {
      title: "Kopvast Website met persoonlijke korting",
      text: offer.offerParagraph,
      price: `${formatPrice(offer.offerPrice)} excl. btw in plaats van ${formatPrice(offer.normalPrice)}`,
      eligible: true,
      reasonLines: offer.reasonLines,
      reasonLabels,
      city,
    };
  }

  return {
    title: "Kopvast Website",
    text:
      "Een professionele website met een duidelijke structuur, sterke presentatie en heldere route naar contact. Automatische korting volgt alleen bij een lokale of inhoudelijke reden uit de spelregels.",
    price: `Vanaf ${products.website.price} excl. btw`,
    eligible: false,
    reasonLines: [],
    reasonLabels,
    city,
  };
}
