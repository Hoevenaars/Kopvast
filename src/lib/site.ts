import { commercialPriceLabel, formatPrice, getProduct, priceCadence } from "@/lib/products";

function catalogDisplay(id: string) {
  const product = getProduct(id);
  if (!product) throw new Error(`Onbekend product ${id}`);
  return {
    name: product.name,
    price: formatPrice(product.priceExVat),
    cadence: priceCadence(product),
    summary: product.description ?? "",
    priceLabel: commercialPriceLabel(product),
  };
}

export const site = {
  name: "Kopvast",
  tagline: "Scherp denken. Sterk uitvoeren.",
  promise: "Je bedrijf staat ergens voor. Laat dat zien.",
  url: "https://kopvast.nl",
  email: "contact@kopvast.nl",
  description:
    "Websites, merken en middelen die laten zien wat je bedrijf waard is. Duidelijke pakketten waar het kan. Maatwerk waar het nodig is.",
};

export const routes = {
  home: "/",
  websites: "/websites",
  merk: "/merk",
  marketing: "/marketingmiddelen",
  werk: "/werk",
  over: "/over-kopvast",
  werkwijze: "/werkwijze",
  check: "/websitecheck",
  aanvraag: "/aanvraag",
  start: "/start",
  maatwerk: "/maatwerk",
  contact: "/contact",
  privacy: "/privacy",
  cookies: "/cookies",
  voorwaarden: "/voorwaarden",
} as const;

export const nav = [
  { href: routes.websites, label: "Websites" },
  { href: routes.merk, label: "Merk" },
  { href: routes.marketing, label: "Marketingmiddelen" },
  { href: routes.werk, label: "Werk" },
  { href: routes.over, label: "Over Kopvast" },
];

export const cta = {
  package: { href: routes.websites, label: "Bekijk het websitepakket" },
  start: { href: routes.aanvraag, label: "Start met Kopvast Website" },
  custom: { href: routes.maatwerk, label: "Bespreek je maatwerkvraag" },
  customIdea: { href: routes.maatwerk, label: "Bespreek mijn idee" },
  check: { href: routes.check, label: "Doe de websitecheck" },
  campaign: { href: `${routes.maatwerk}?type=campagne`, label: "Bespreek je campagne" },
  merk: { href: routes.merk, label: "Bekijk merkidentiteit" },
  marketing: { href: routes.marketing, label: "Bekijk marketingmiddelen" },
  templates: { href: `${routes.marketing}#sjablonen`, label: "Bekijk de sjablonen" },
  refresh: { href: `${routes.merk}#merkrefresh`, label: "Bekijk de merkrefresh" },
};

const websiteProduct = catalogDisplay("website_standard");

export const products = {
  website: {
    ...websiteProduct,
    priceLabel: `vanaf ${websiteProduct.price}`,
  },
  hosting: catalogDisplay("hosting"),
  hostingPlus: catalogDisplay("hosting_plus"),
  beheer: catalogDisplay("managed"),
  merkrefresh: catalogDisplay("merkrefresh"),
  sjablonen: catalogDisplay("templates"),
};

export const includedWebsite = [
  "maximaal zes kernpagina’s",
  "responsive ontwerp",
  "één taal",
  "duidelijke navigatie",
  "contactformulier",
  "basis SEO",
  "verwerking van bestaande content",
  "één correctieronde",
  "reguliere migratie",
  "technische oplevercontrole",
];

export const includedHosting = [...(getProduct("hosting")?.includes ?? [])];

export const includedBeheer = [...(getProduct("managed")?.includes ?? [])];

export const merkRefreshItems = [
  "kleuren",
  "typografie",
  "beeldrichting",
  "schrijfstijl",
  "visuele regels",
  "compacte merkset",
];

export const processSteps = [
  {
    n: "01",
    title: "Inzicht",
    text: "We brengen scherp in beeld wat er beter kan en wat je echt nodig hebt.",
  },
  {
    n: "02",
    title: "Plan",
    text: "Je ontvangt een concreet voorstel met scope, prijs en planning.",
  },
  {
    n: "03",
    title: "Realisatie",
    text: "We ontwerpen en bouwen. Jij kijkt mee op de momenten die ertoe doen.",
  },
  {
    n: "04",
    title: "Live",
    text: "Na jouw akkoord gaat het live. Daarna kunnen we beheer en verdere uitbouw verzorgen.",
  },
];

export const propositions = [
  {
    href: routes.websites,
    title: "Een website op het niveau van je bedrijf.",
    label: "Websites",
    text: "Professioneel, duidelijk en gebouwd om vertrouwen om te zetten in contact.",
    cta: "Bekijk het websitepakket",
    price: products.website.priceLabel,
  },
  {
    href: routes.merk,
    title: "Een uitstraling die overal klopt.",
    label: "Merk",
    text: "We bouwen voort op wat goed is en scherpen aan wat beter kan. Van kleur en typografie tot beeldstijl en merkgebruik.",
    cta: "Bekijk merkidentiteit",
  },
  {
    href: routes.marketing,
    title: "Een merk is pas sterk als je het kunt gebruiken.",
    label: "Marketingmiddelen",
    text: "Offertes, presentaties, social formats, flyers en campagnes in één herkenbare lijn.",
    cta: "Bekijk marketingmiddelen",
  },
];

export const conceptCases = [
  {
    slug: "lindenhof",
    name: "Lindenhof",
    sector: "Hospitality / locatie",
    title: "Een locatie die online even sterk oogt als ter plekke.",
    image: "/images/venue.jpg",
    imageAlt: "Landhuis aan het water, gebruikt als beeld in de conceptwebsite",
    problem: "De online uitstraling liep achter op het niveau van de locatie.",
    approach: "Website + merkstijl + offerte + social uiting.",
    delivered: ["desktopwebsite", "mobiele website", "merkstijl", "offerte / arrangement", "social uiting"],
    summary:
      "Zes kernpagina’s, een herkenbare merkstijl en middelen waarmee de locatie een aanvraag kan ontvangen zonder versnipperde kanalen.",
  },
  {
    slug: "ardea",
    name: "Ardea",
    sector: "Zakelijke dienstverlening",
    title: "Eén lijn voor website, presentatie en dagelijkse middelen.",
    image: "/images/evening.jpg",
    imageAlt: "Moderne bedrijfswoning in avondlicht, gebruikt als beeld in de conceptcase",
    problem: "Website, presentatie en LinkedIn spraken drie verschillende talen.",
    approach: "Website + presentatie + social format + e-mailhandtekening.",
    delivered: ["website", "presentatie", "LinkedIn / social format", "e-mailhandtekening"],
    summary:
      "Een zakelijke site die de expertise helder maakt, met middelen die het team dagelijks kan gebruiken.",
  },
  {
    slug: "nora",
    name: "NORA",
    sector: "Consumentenmerk / lifestyle",
    title: "Een merkrefresh die je ook echt kunt inzetten.",
    image: "/images/house.jpg",
    imageAlt: "Licht landhuis in het groen, gebruikt als beeld in de lifestyle-conceptcase",
    problem: "De uitstraling was herkenbaar, maar versnipperd en niet meer passend.",
    approach: "Merkrefresh + website + flyer + social formats.",
    delivered: ["merkrefresh", "website", "flyer", "social formats"],
    summary:
      "Wat herkenbaar was bleef staan. Kleur, typografie en middelen werden aangescherpt tot één bruikbare lijn.",
  },
] as const;

export const websitePages = [
  "Home",
  "Aanbod / diensten",
  "Over het bedrijf",
  "Werk / voorbeelden",
  "Veelgestelde vragen",
  "Contact",
];

export const brandStates = [
  { value: "sterk", label: "We hebben een sterke huisstijl" },
  { value: "verouderd", label: "De uitstraling is verouderd of versnipperd" },
  { value: "geen", label: "Er is nog geen vaste merkstijl" },
];

export const assetOptions = [
  { value: "logo", label: "Logo en huisstijlbestanden" },
  { value: "foto", label: "Eigen fotografie" },
  { value: "tekst", label: "Bestaande teksten" },
  { value: "geen", label: "Nog weinig bruikbare middelen" },
];

export const customFeatures = [
  { value: "meer-paginas", label: "Meer dan zes pagina’s" },
  { value: "webshop", label: "Webshop" },
  { value: "reserveren", label: "Reserverings- of boekingssysteem" },
  { value: "portaal", label: "Klantomgeving" },
  { value: "talen", label: "Extra talen" },
  { value: "koppelingen", label: "Koppelingen met andere software" },
  { value: "campagne", label: "Campagne of landingspagina" },
  { value: "anders", label: "Iets anders" },
];

export const sizeOptions = [
  { value: "compact", label: "Compact", text: "Eén duidelijke uitbreiding op het vaste pakket." },
  { value: "middel", label: "Middel", text: "Meerdere pagina’s of een specifieke functie." },
  { value: "groot", label: "Uitgebreid", text: "Webshop, portaal of een grotere digitale omgeving." },
];

export const timingOptions = [
  { value: "snel", label: "Zo snel als het goed kan" },
  { value: "kwartaal", label: "Binnen drie maanden" },
  { value: "oriënterend", label: "Eerst oriënteren" },
];
