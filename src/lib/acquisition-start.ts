import { parseDomainParam } from "@/lib/domain-landing";
import {
  formatPrice,
  REGIONAL_ACQUISITION_PRICE_EX_VAT,
  WEBSITE_LIST_PRICE_EX_VAT,
} from "@/lib/products";
import { includedWebsite, products, site } from "@/lib/site";

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
  offerPrice: AcquisitionOfferPrice;
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
  return {
    choice: parseAcquisitionChoice(input.keuze),
    website: parseDomainParam(firstQueryValue(input.website)) ?? "",
    company: parseCompanyParam(input.bedrijf),
    offerPrice: parseOfferPrice(input.prijs),
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
  const offerPrice =
    input.offerPrice === REGIONAL_ACQUISITION_PRICE_EX_VAT
      ? REGIONAL_ACQUISITION_PRICE_EX_VAT
      : input.offerPrice === WEBSITE_LIST_PRICE_EX_VAT
        ? WEBSITE_LIST_PRICE_EX_VAT
        : null;

  function href(choice: AcquisitionChoice) {
    const params = new URLSearchParams();
    params.set("keuze", choice);
    if (website) params.set("website", website);
    if (company) params.set("bedrijf", company);
    if (offerPrice) params.set("prijs", String(offerPrice));
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

export function startLandingCopy(params: AcquisitionStartParams) {
  const who = params.company || params.website;
  const price = formatOfferPrice(params.offerPrice);
  const priceLine =
    params.offerPrice === REGIONAL_ACQUISITION_PRICE_EX_VAT
      ? `Een complete Kopvast Website kost normaal ${products.website.price} excl. btw. Voor jullie staat ${price} excl. btw.`
      : `${products.website.name} kost ${price} ${products.website.cadence}.`;

  if (params.choice === "info") {
    return {
      eyebrow: "Meer info",
      title: "Dit is het websitepakket. Je kunt meteen starten.",
      text: `${priceLine} Wat erin zit staat hiernaast. Als het past, vul je je gegevens in en koop je het pakket.`,
      submitLabel: "Start Kopvast Website",
    };
  }

  return {
    eyebrow: "Voorstel",
    title: who ? `Een voorstel voor ${who}.` : "Dan zetten we het voorstel klaar.",
    text: `${priceLine} Vul dit in. We zetten het websitepakket klaar — geen extra gesprek nodig als de scope past.`,
    submitLabel: "Start Kopvast Website",
  };
}

export function startPackageItems() {
  return includedWebsite;
}

export function startConfirmLabel(price: AcquisitionOfferPrice) {
  return `Ik wil starten met Kopvast Website voor ${formatOfferPrice(price)} excl. btw.`;
}
