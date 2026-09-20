import { products } from "@/lib/site";
import type { ProductFit } from "@/lib/acquisition-constants";
import {
  buildSpecialOffer,
  type ContentOfferReason,
  type GeographicOfferReason,
  type OfferEvidence,
} from "@/lib/acquisition/special-offer-rules";

export const PERSONAL_APPROACH_TITLE = "Spelregels persoonlijke benadering";

export const PERSONAL_APPROACH_INTRO =
  "Deze regels sturen de acquisitiemail. Ze maken de tekst scherp en persoonlijk, en bepalen of er een korting in de mail komt.";

export const PERSONAL_APPROACH_MAIL_RULES = [
  "Schrijf alsof je de website zelf kort hebt bekeken. De ontvanger mag niet merken dat de tekst automatisch is gemaakt.",
  "Opening: maximaal één of twee korte zinnen over iets specifieks — bedrijf, locatie, aanbod, karakter of doelgroep.",
  "Daarna exact twee verschillende bevindingen, in menselijke taal. Eerst positionering en uitstraling, daarna contactroute, mobiel of content.",
  "Geen AI, scan, algoritme of opportunity score noemen. Geen prijzen of korting in de opening.",
  "Onderwerp blijft: Even gekeken naar [domein].",
] as const;

export const PERSONAL_APPROACH_DISCOUNT_RULES = [
  "Alleen bij een standaard website-fit. Maatwerk of geen fit krijgt geen automatische €995.",
  "Normale prijs blijft €1.495 excl. btw. De korting is €995 excl. btw — nooit “vanaf €995”.",
  "Geografisch, in deze volgorde: Groesbeek, eigen gemeente Berg en Dal, regio Nijmegen.",
  "Inhoudelijk alleen met hard bewijs van de website: erfgoed, lokale bijdrage, toerisme, cultuur, sterke Kopvast-case, lokaal ondernemerschap of een kleine sterke organisatie.",
  "Maximaal één geografische en één inhoudelijke reden. Geen reden verzinnen. Zonder reden geen automatische korting.",
] as const;

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
      price: "€995 excl. btw in plaats van €1.495",
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
