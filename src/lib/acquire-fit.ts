import type { MappedFinding } from "./acquire-map";
import type { ProductFit } from "./acquisition-constants";

export type ComplexityFlags = {
  has_webshop: boolean;
  has_login: boolean;
  has_booking_system: boolean;
  has_customer_portal: boolean;
  has_complex_integrations: boolean;
  has_multiple_languages: boolean;
  has_large_content_volume: boolean;
  has_multiple_locations: boolean;
  has_custom_calculator: boolean;
};

const CUSTOM_PATTERNS: Array<{ flag: keyof ComplexityFlags; pattern: RegExp }> = [
  { flag: "has_webshop", pattern: /\b(webshop|webwinkel|woocommerce|shopify|winkelwagen|checkout|e-?commerce)\b/i },
  { flag: "has_booking_system", pattern: /\b(reserver|boeking|afspraak\s?systeem|calendly|booking)\b/i },
  { flag: "has_customer_portal", pattern: /\b(klantomgeving|klantportaal|mijn\s+omgeving|customer portal)\b/i },
  { flag: "has_login", pattern: /\b(inloggen|login|account aanmaken|dashboard)\b/i },
  { flag: "has_complex_integrations", pattern: /\b(koppeling|integratie|api|crm|erp)\b/i },
  { flag: "has_multiple_languages", pattern: /\b(meerdere talen|multilingual|vertaling|hreflang|english version)\b/i },
  { flag: "has_large_content_volume", pattern: /\b(grote website|tientallen pagina|veel pagina|50\+ pagina)\b/i },
  { flag: "has_custom_calculator", pattern: /\b(configurator|calculator|offerte-?tool)\b/i },
  { flag: "has_multiple_locations", pattern: /\b(vestigingen|meerdere locaties|filialen)\b/i },
];

export function emptyComplexityFlags(): ComplexityFlags {
  return {
    has_webshop: false,
    has_login: false,
    has_booking_system: false,
    has_customer_portal: false,
    has_complex_integrations: false,
    has_multiple_languages: false,
    has_large_content_volume: false,
    has_multiple_locations: false,
    has_custom_calculator: false,
  };
}

export function detectComplexityFlags(input: {
  title?: string | null;
  htmlText?: string | null;
  findings: MappedFinding[];
  flags?: Partial<ComplexityFlags>;
}): ComplexityFlags {
  const flags = { ...emptyComplexityFlags(), ...input.flags };
  const haystack = [
    input.title ?? "",
    input.htmlText ?? "",
    ...input.findings.map((item) => `${item.title} ${item.description} ${item.evidence_reference}`),
  ].join("\n");

  for (const item of CUSTOM_PATTERNS) {
    if (item.pattern.test(haystack)) flags[item.flag] = true;
  }
  return flags;
}

export function complexityCount(flags: ComplexityFlags): number {
  return Object.values(flags).filter(Boolean).length;
}

export function determineProductFit(input: {
  flags: ComplexityFlags;
  unsupportedLanguage?: boolean;
  insufficientEvidence?: boolean;
  notABusinessSite?: boolean;
}): { fit: ProductFit; reason: string; complexityScore: number } {
  const flags = input.flags;
  const count = complexityCount(flags);
  const complexityScore = Math.min(100, count * 18);

  if (input.notABusinessSite) {
    return {
      fit: "NOT_FIT",
      reason: "De site lijkt geen commerciële bedrijfswebsite waarop Kopvast kan aansluiten.",
      complexityScore,
    };
  }

  if (input.unsupportedLanguage) {
    return {
      fit: "NOT_FIT",
      reason: "De site is niet in een taal waarin Kopvast nu outreach doet.",
      complexityScore,
    };
  }

  if (input.insufficientEvidence) {
    return {
      fit: "REVIEW_REQUIRED",
      reason: "Er is nog te weinig zicht op de functionaliteit om standaard of maatwerk te bepalen.",
      complexityScore,
    };
  }

  if (
    flags.has_webshop ||
    flags.has_customer_portal ||
    flags.has_booking_system ||
    flags.has_complex_integrations ||
    flags.has_large_content_volume ||
    flags.has_custom_calculator ||
    (flags.has_multiple_languages && flags.has_login) ||
    count >= 2
  ) {
    return {
      fit: "CUSTOM_FIT",
      reason:
        "De site is commercieel interessant, maar de functionaliteit valt waarschijnlijk buiten het vaste websitepakket.",
      complexityScore,
    };
  }

  return {
    fit: "STANDARD_FIT",
    reason: "De site past waarschijnlijk binnen Kopvast Website: presentatie, structuur en contactroute.",
    complexityScore,
  };
}
