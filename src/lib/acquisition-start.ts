import { parseDomainParam } from "@/lib/domain-landing";
import {
  formatPrice,
  REGIONAL_ACQUISITION_PRICE_EX_VAT,
  WEBSITE_LIST_PRICE_EX_VAT,
} from "@/lib/products";
import { includedWebsite, site } from "@/lib/site";

export const ACQUISITION_START_PATH = "/start";
export const ACQUISITION_PROPOSAL_SOURCE = "acquisitie-voorstel";
export const ACQUISITION_INFO_SOURCE = "acquisitie-info";

export const acquisitionChoices = [
  { value: "voorstel", label: "Voorstel" },
  { value: "info", label: "Meer info" },
] as const;

export type AcquisitionChoice = (typeof acquisitionChoices)[number]["value"];
export type AcquisitionOfferPrice = typeof REGIONAL_ACQUISITION_PRICE_EX_VAT | typeof WEBSITE_LIST_PRICE_EX_VAT;

export type AcquisitionStartParams = {
  choice: AcquisitionChoice;
  website: string;
  company: string;
};

function firstQueryValue(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return "";
}

export function parseAcquisitionChoice(raw: unknown): AcquisitionChoice {
  const value = firstQueryValue(raw).trim().toLowerCase();
  if (value === "info" || value === "meer-info" || value === "meer_info" || value === "meer info") {
    return "info";
  }
  return "voorstel";
}

export function parseCompanyParam(raw: unknown): string {
  const rawText = firstQueryValue(raw);
  if (!rawText) return "";
  return rawText
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function parseOfferPrice(raw: unknown): AcquisitionOfferPrice {
  const digits = firstQueryValue(raw).replace(/\D/g, "");
  return digits === String(REGIONAL_ACQUISITION_PRICE_EX_VAT)
    ? REGIONAL_ACQUISITION_PRICE_EX_VAT
    : WEBSITE_LIST_PRICE_EX_VAT;
}

export function offerPriceFromParagraph(text: string | null | undefined): AcquisitionOfferPrice {
  return new RegExp(`€\\s*${REGIONAL_ACQUISITION_PRICE_EX_VAT}`).test(text ?? "")
    ? REGIONAL_ACQUISITION_PRICE_EX_VAT
    : WEBSITE_LIST_PRICE_EX_VAT;
}

export function explicitOfferPriceInText(text: string | null | undefined): AcquisitionOfferPrice | null {
  if (new RegExp(`€\\s*${REGIONAL_ACQUISITION_PRICE_EX_VAT}\\b`).test(text ?? "")) {
    return REGIONAL_ACQUISITION_PRICE_EX_VAT;
  }
  if (/€\s*1[.,]?495\b/.test(text ?? "")) return WEBSITE_LIST_PRICE_EX_VAT;
  return null;
}

export function formatOfferPrice(price: AcquisitionOfferPrice) {
  return formatPrice(price);
}

export function parseStartSearchParams(input: {
  keuze?: string | string[];
  website?: string | string[];
  bedrijf?: string | string[];
  prijs?: string | string[];
}): AcquisitionStartParams {
  void input.prijs;
  return {
    choice: parseAcquisitionChoice(input.keuze),
    website: parseDomainParam(firstQueryValue(input.website)) ?? "",
    company: parseCompanyParam(input.bedrijf),
  };
}

export function acquisitionChoiceUrls(
  input: {
    domain?: string | null;
    companyName?: string | null;
    offerPrice?: number | null;
  } = {}
) {
  const website = parseDomainParam(input.domain) ?? "";
  const company = parseCompanyParam(input.companyName);
  void input.offerPrice;

  function href(choice: AcquisitionChoice) {
    const params = new URLSearchParams();
    params.set("keuze", choice);
    if (website) params.set("website", website);
    if (company) params.set("bedrijf", company);
    return `${site.url}${ACQUISITION_START_PATH}?${params.toString()}`;
  }

  return {
    choiceAUrl: href("voorstel"),
    choiceBUrl: href("info"),
  };
}

export const DEFAULT_CHOICE_A_URL = acquisitionChoiceUrls().choiceAUrl;
export const DEFAULT_CHOICE_B_URL = acquisitionChoiceUrls().choiceBUrl;

export function acquisitionSource(choice: AcquisitionChoice) {
  return choice === "info" ? ACQUISITION_INFO_SOURCE : ACQUISITION_PROPOSAL_SOURCE;
}

export function isAcquisitionStartSource(source: string | null | undefined) {
  return source === ACQUISITION_PROPOSAL_SOURCE || source === ACQUISITION_INFO_SOURCE;
}

export function confirmedInterestCopy(input: { choice: AcquisitionChoice; hasWebsite: boolean; company?: string }) {
  const who = input.company?.trim();
  if (input.choice === "voorstel") {
    return {
      eyebrow: "Voorstel",
      title: who ? `Een voorstel voor ${who}.` : "Een voorstel.",
      text: "Je bevestigt dat Kopvast een voorstel mag maken. Dat is nog geen akkoord en geen opdracht.",
      confirm: "Maak een voorstel voor mij.",
      step: "Daarna maakt Kopvast een voorstel. Pas als je dat voorstel accepteert, ontstaat een opdracht.",
    };
  }
  if (!input.hasWebsite) {
    return {
      eyebrow: "Kennismaken",
      title: who ? `${who} heeft nog geen website.` : "Nog geen website.",
      text: "Je bevestigt dat je wilt zien welke richting Kopvast in gedachten heeft. Geen opdracht.",
      confirm: "Ja, laat eens zien wat je in gedachten hebt.",
      step: "Kopvast laat een richting zien. Er komt nog geen voorstel en geen opdracht.",
    };
  }
  return {
    eyebrow: "Mogelijkheden",
    title: who ? `De mogelijkheden voor ${who}.` : "De mogelijkheden.",
    text: "Je bevestigt dat je meer wilt horen over wat er kan. Geen opdracht en geen prijs uit deze link.",
    confirm: "Vertel me meer over de mogelijkheden.",
    step: "Kopvast bespreekt de mogelijkheden. Een voorstel volgt alleen als je dat vraagt.",
  };
}

export function startLandingCopy(params: AcquisitionStartParams) {
  const who = params.company || params.website;

  if (params.choice === "info") {
    return {
      eyebrow: "Meer info",
      title: who ? `Meer horen over wat Kopvast voor ${who} kan doen.` : "Meer horen, zonder verplichting.",
      text: "Je laat weten dat je wilt horen wat er kan. Een prijs staat pas in een voorstel, en een opdracht pas als je dat voorstel accepteert.",
      submitLabel: "Bevestig je interesse",
    };
  }

  return {
    eyebrow: "Voorstel bespreken",
    title: who ? `Een richting voor ${who}.` : "Laten we een richting bespreken.",
    text: "Je vraagt een voorstel aan. Dat is nog geen akkoord. De afgesproken prijs staat pas in het voorstel.",
    submitLabel: "Vraag een voorstel aan",
  };
}

export function startPackageItems() {
  return includedWebsite;
}
