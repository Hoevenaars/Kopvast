import { buildOfferParagraph, validateOfferParagraph } from "@/emails/acquisition-outreach-copy";
import type { ProductFit } from "@/lib/acquisition-constants";
import { REGIONAL_ACQUISITION_PRICE_EX_VAT, WEBSITE_LIST_PRICE_EX_VAT } from "@/lib/products";

export type { ProductFit };

export type GeographicOfferReason = "GROESBEEK" | "BERG_EN_DAL" | "REGION_NIJMEGEN" | null;

export type ContentOfferReason =
  | "LOCAL_CONTRIBUTION"
  | "HERITAGE_SPECIAL_PLACE"
  | "SMALL_STRONG_ORGANISATION"
  | "LOCAL_ENTREPRENEURSHIP"
  | "STRONG_KOPVAST_CASE"
  | "REGIONAL_TOURISM"
  | "CULTURE_OR_HISTORY"
  | null;

export const CONTENT_CONFIDENCE_THRESHOLD = 0.75;

export const APPROACH_SOURCE_KINDS = ["website", "manual_note", "project_description", "company_profile"] as const;

export type ApproachSourceKind = (typeof APPROACH_SOURCE_KINDS)[number];

export type WebsitePresence = "HAS_WEBSITE" | "NO_WEBSITE";

export type OfferEvidence = {
  reason: Exclude<ContentOfferReason, null>;
  evidence: string;
  confidence: number;
  sourceUrl?: string;
  sourceKind?: ApproachSourceKind;
};

export type SpecialOfferInput = {
  productFit: ProductFit;
  place?: string | null;
  municipality?: string | null;
  contentEvidence?: OfferEvidence[];
  /**
   * Voor prospects buiten de regio waarvoor we toch bewust
   * de €995 launch-propositie willen gebruiken.
   */
  allowLaunchOffer?: boolean;
  /**
   * Handmatig gekozen redenen. Slaat plaats- en bewijsdetectie over.
   * null betekent bewust geen reden van dat type.
   */
  manualReasons?: {
    geographicReason: GeographicOfferReason;
    contentReason: ContentOfferReason;
  };
};

export type SpecialOfferResult = {
  eligible: boolean;
  normalPrice: typeof WEBSITE_LIST_PRICE_EX_VAT;
  offerPrice: typeof REGIONAL_ACQUISITION_PRICE_EX_VAT;
  geographicReason: GeographicOfferReason;
  contentReason: ContentOfferReason;
  reasonLines: string[];
  offerParagraph: string;
};

export const CONTENT_REASON_PRIORITY: Exclude<ContentOfferReason, null>[] = [
  "HERITAGE_SPECIAL_PLACE",
  "LOCAL_CONTRIBUTION",
  "REGIONAL_TOURISM",
  "CULTURE_OR_HISTORY",
  "STRONG_KOPVAST_CASE",
  "LOCAL_ENTREPRENEURSHIP",
  "SMALL_STRONG_ORGANISATION",
];

const CONTENT_REASON_SET = new Set<string>(CONTENT_REASON_PRIORITY);

export function isContentOfferReason(value: string): value is Exclude<ContentOfferReason, null> {
  return CONTENT_REASON_SET.has(value);
}

export function isApproachSourceKind(value: string): value is ApproachSourceKind {
  return (APPROACH_SOURCE_KINDS as readonly string[]).includes(value);
}

const GEOGRAPHIC_REASON_SET = new Set<string>(["GROESBEEK", "BERG_EN_DAL", "REGION_NIJMEGEN"]);

export function isGeographicOfferReason(value: string): value is Exclude<GeographicOfferReason, null> {
  return GEOGRAPHIC_REASON_SET.has(value);
}

function normalizeLocation(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const BERG_EN_DAL_MUNICIPALITY = "berg en dal";

/**
 * Plaatsen in de eigen gemeente. Alleen gebruikt wanneer de gemeente
 * niet bekend is. Groesbeek blijft daarboven een aparte prioriteit.
 * Geen dorpenlijst voor omliggende gemeenten.
 */
const BERG_EN_DAL_PLACES = new Set([
  "berg en dal",
  "persingen",
  "beek",
  "ubbergen",
  "ooij",
  "leuth",
  "kekerdom",
  "erlecom",
  "millingen aan de rijn",
  "millingen",
  "heilig landstichting",
  "breedeweg",
  "de horst",
]);

const REGION_NIJMEGEN_MUNICIPALITIES = new Set([
  "nijmegen",
  "beuningen",
  "druten",
  "heumen",
  "mook en middelaar",
  "wijchen",
]);

export function determineGeographicReason(
  place?: string | null,
  municipality?: string | null
): GeographicOfferReason {
  const normalizedPlace = normalizeLocation(place);
  const normalizedMunicipality = normalizeLocation(municipality);

  if (normalizedPlace === "groesbeek") {
    return "GROESBEEK";
  }

  if (normalizedMunicipality === BERG_EN_DAL_MUNICIPALITY) {
    return "BERG_EN_DAL";
  }

  if (BERG_EN_DAL_PLACES.has(normalizedPlace)) {
    return "BERG_EN_DAL";
  }

  if (REGION_NIJMEGEN_MUNICIPALITIES.has(normalizedMunicipality)) {
    return "REGION_NIJMEGEN";
  }

  if (REGION_NIJMEGEN_MUNICIPALITIES.has(normalizedPlace)) {
    return "REGION_NIJMEGEN";
  }

  return null;
}

function geographicReasonCopy(reason: GeographicOfferReason): string | null {
  switch (reason) {
    case "GROESBEEK":
      return "Als Groesbekers onder elkaar doe je dat voor elkaar.";
    case "BERG_EN_DAL":
      return "Binnen mijn eigen gemeente doe ik graag iets extra’s.";
    case "REGION_NIJMEGEN":
      return "Ik heb graag mooie klanten in de regio. Daarom doe ik voor jullie graag iets extra’s.";
    default:
      return null;
  }
}

export function determineContentReason(evidence: OfferEvidence[] = []): ContentOfferReason {
  const validEvidence = evidence.filter(
    (item) => item.confidence >= CONTENT_CONFIDENCE_THRESHOLD && item.evidence && item.evidence.trim().length > 0
  );

  for (const priority of CONTENT_REASON_PRIORITY) {
    const match = validEvidence.find((item) => item.reason === priority);
    if (match) return match.reason;
  }

  return null;
}

function contentReasonCopy(reason: ContentOfferReason): string | null {
  switch (reason) {
    case "LOCAL_CONTRIBUTION":
      return "Jullie voegen zichtbaar iets toe aan de omgeving. Daar draag ik met Kopvast graag een beetje aan bij.";
    case "HERITAGE_SPECIAL_PLACE":
      return "Als er offline zoiets bijzonders staat, vind ik het zonde als dat online niet hetzelfde gevoel oproept.";
    case "SMALL_STRONG_ORGANISATION":
      return "Voor kleinere organisaties met een sterk verhaal wil ik de stap naar een goede website bewust haalbaar houden.";
    case "LOCAL_ENTREPRENEURSHIP":
      return "Ik werk graag met ondernemers die zelf dicht op hun bedrijf en omgeving zitten.";
    case "STRONG_KOPVAST_CASE":
      return "Dit is precies het soort organisatie waarmee ik Kopvast graag verder opbouw.";
    case "REGIONAL_TOURISM":
      return "Dit soort plekken maakt de regio aantrekkelijk. Ik vind het leuk om eraan bij te dragen dat dat online ook goed zichtbaar wordt.";
    case "CULTURE_OR_HISTORY":
      return "Organisaties die het verhaal en karakter van de regio levend houden help ik graag iets extra’s.";
    default:
      return null;
  }
}

export type PersonalApproachSelection = {
  websitePresence: WebsitePresence;
  geographicReason: GeographicOfferReason;
  contentReason: ContentOfferReason;
  /** De ene reden die in de mailopening gebruikt wordt. */
  openingAxis: "geographic" | "content" | null;
  evidence: string | null;
  sourceUrl: string | null;
  sourceKind: ApproachSourceKind | null;
  confidence: number | null;
  sufficient: boolean;
};

function usableContentEvidence(item: OfferEvidence, manual: boolean) {
  if (!item.evidence?.trim()) return false;
  if (manual) return true;
  return item.confidence >= CONTENT_CONFIDENCE_THRESHOLD;
}

/**
 * Persoonlijke aanleiding. Zelfde plaats- en inhoudsclassificatie als het
 * commerciële aanbod, maar zonder prijs. Een gekozen reden maakt de mail
 * niet automatisch kortingsgerechtigd.
 */
export function selectPersonalApproach(input: {
  place?: string | null;
  municipality?: string | null;
  contentEvidence?: OfferEvidence[];
  manualReasons?: {
    geographicReason: GeographicOfferReason;
    contentReason: ContentOfferReason;
  };
  websitePresence?: WebsitePresence;
}): PersonalApproachSelection {
  const websitePresence = input.websitePresence ?? "HAS_WEBSITE";
  const evidence = input.contentEvidence ?? [];
  const manual = Boolean(input.manualReasons);
  const geographicReason = manual
    ? input.manualReasons!.geographicReason
    : determineGeographicReason(input.place, input.municipality);
  const contentReason = manual ? input.manualReasons!.contentReason : determineContentReason(evidence);
  const support = contentReason
    ? (evidence
        .filter((item) => item.reason === contentReason && usableContentEvidence(item, manual))
        .sort((a, b) => b.confidence - a.confidence)[0] ?? null)
    : null;
  const contentReady = Boolean(contentReason && support);
  const openingAxis: PersonalApproachSelection["openingAxis"] = contentReady
    ? "content"
    : geographicReason
      ? "geographic"
      : null;

  if (openingAxis === "content" && support && contentReason) {
    return {
      websitePresence,
      geographicReason,
      contentReason,
      openingAxis,
      evidence: support.evidence.trim(),
      sourceUrl: support.sourceUrl?.trim() || null,
      sourceKind: support.sourceKind ?? (websitePresence === "HAS_WEBSITE" ? "website" : null),
      confidence: support.confidence,
      sufficient: true,
    };
  }

  if (openingAxis === "geographic" && geographicReason) {
    const place = input.place?.trim() || input.municipality?.trim() || null;
    return {
      websitePresence,
      geographicReason,
      contentReason,
      openingAxis,
      evidence: place,
      sourceUrl: null,
      sourceKind: null,
      confidence: null,
      sufficient: true,
    };
  }

  return {
    websitePresence,
    geographicReason,
    contentReason,
    openingAxis: null,
    evidence: null,
    sourceUrl: null,
    sourceKind: null,
    confidence: null,
    sufficient: false,
  };
}

const LAUNCH_REASON =
  "Ik bouw Kopvast graag verder op met een aantal sterke klanten waarvoor we samen mooi werk kunnen neerzetten. Daarom maak ik voor jullie graag een scherpe uitzondering.";

export function buildSpecialOffer(input: SpecialOfferInput): SpecialOfferResult {
  if (input.productFit !== "STANDARD_FIT") {
    return {
      eligible: false,
      normalPrice: WEBSITE_LIST_PRICE_EX_VAT,
      offerPrice: REGIONAL_ACQUISITION_PRICE_EX_VAT,
      geographicReason: null,
      contentReason: null,
      reasonLines: [],
      offerParagraph: "",
    };
  }

  const geographicReason = input.manualReasons
    ? input.manualReasons.geographicReason
    : determineGeographicReason(input.place, input.municipality);
  const contentReason = input.manualReasons
    ? input.manualReasons.contentReason
    : determineContentReason(input.contentEvidence);
  const reasonLines: string[] = [];
  const geographicCopy = geographicReasonCopy(geographicReason);
  const contentCopy = contentReasonCopy(contentReason);

  if (geographicCopy) reasonLines.push(geographicCopy);
  if (contentCopy) reasonLines.push(contentCopy);

  const selectedReasons = reasonLines.slice(0, 2);

  if (selectedReasons.length === 0 && input.allowLaunchOffer) {
    selectedReasons.push(LAUNCH_REASON);
  }

  if (selectedReasons.length === 0) {
    return {
      eligible: false,
      normalPrice: WEBSITE_LIST_PRICE_EX_VAT,
      offerPrice: REGIONAL_ACQUISITION_PRICE_EX_VAT,
      geographicReason,
      contentReason,
      reasonLines: [],
      offerParagraph: "",
    };
  }

  const offerParagraph = buildOfferParagraph(selectedReasons.join(" "));
  validateOfferParagraph(offerParagraph);

  return {
    eligible: true,
    normalPrice: WEBSITE_LIST_PRICE_EX_VAT,
    offerPrice: REGIONAL_ACQUISITION_PRICE_EX_VAT,
    geographicReason,
    contentReason,
    reasonLines: selectedReasons,
    offerParagraph,
  };
}
