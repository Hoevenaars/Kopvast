import type { Metadata } from "next";
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
  promise: "Sterk zichtbaar. Slim geregeld.",
  line: "Persoonlijk waar het telt. Efficiënt waar het kan.",
  url: "https://kopvast.nl",
  email: "contact@kopvast.nl",
  description:
    "Kopvast helpt ondernemers en organisaties vooruit met professionele websites, sterke merken, praktische marketing en slimme automatisering.",
};

export function pageMeta(path: string, title: string, description: string): Metadata {
  const url = path === "/" ? site.url : `${site.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      locale: "nl_NL",
      type: "website",
      siteName: site.name,
    },
  };
}

export const routes = {
  home: "/",
  websites: "/websites",
  merk: "/merk",
  marketing: "/marketingmiddelen",
  automatisering: "/automatisering",
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
  { href: routes.merk, label: "Merk & ontwerp" },
  { href: routes.marketing, label: "Marketing & activatie" },
  { href: routes.automatisering, label: "Automatisering & AI" },
  { href: routes.werk, label: "Werk" },
  { href: routes.over, label: "Over Kopvast" },
];

export const cta = {
  discuss: { href: routes.contact, label: "Bespreek je idee" },
  discover: { href: `${routes.contact}?cta=ontdek`, label: "Ontdek wat mogelijk is" },
  work: { href: routes.werk, label: "Bekijk ons werk" },
  website: { href: `${routes.contact}?dienst=website-nieuw&cta=website`, label: "Bespreek jouw website" },
  websiteScope: { href: `${routes.websites}#pakket`, label: "Bekijk wat inbegrepen is" },
  appearance: { href: `${routes.contact}?dienst=merk&cta=merk`, label: "Bespreek je uitstraling" },
  campaign: { href: `${routes.contact}?dienst=marketing&cta=marketing`, label: "Bespreek je campagne of middel" },
  automation: { href: `${routes.contact}?dienst=automatisering&cta=automatisering`, label: "Bespreek wat slimmer kan" },
  check: { href: routes.check, label: "Doe de websitecheck" },
  custom: { href: routes.maatwerk, label: "Bespreek een specifieke vraag" },
  package: { href: routes.websites, label: "Bekijk websites" },
  start: { href: `${routes.contact}?dienst=website-nieuw&cta=website`, label: "Bespreek jouw website" },
  customIdea: { href: routes.contact, label: "Bespreek je idee" },
  merk: { href: routes.merk, label: "Bekijk merk en ontwerp" },
  marketing: { href: routes.marketing, label: "Bekijk marketing en activatie" },
  templates: { href: `${routes.marketing}#sjablonen`, label: "Bekijk de sjablonen" },
  refresh: { href: `${routes.merk}#merkrefresh`, label: "Bekijk de merkrefresh" },
};

const websiteProduct = catalogDisplay("website_standard");

export const products = {
  website: {
    ...websiteProduct,
    priceLabel: websiteProduct.price,
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

export const excludedWebsite = [
  "meer dan zes kernpagina’s",
  "extra talen",
  "webshop, reserveringen of een klantomgeving",
  "koppelingen met andere software",
  "een volledige nieuwe merkidentiteit",
  "hosting en beheer, tenzij dat apart in het voorstel staat",
];

export const needs = [
  "Nog geen goede website?",
  "Je uitstraling kan sterker?",
  "Je marketingmiddelen passen niet bij elkaar?",
  "Te veel handmatig werk en dubbele administratie?",
];

export const reasons = [
  {
    title: "Je weet wat je krijgt",
    text: "Eerst de vraag, dan een voorstel dat daarbij past. Scope en prijs staan op papier.",
  },
  {
    title: "Eén herkenbare lijn",
    text: "Website, merk en middelen vertellen hetzelfde verhaal, online en op papier.",
  },
  {
    title: "Een partij die het ook maakt",
    text: "Van de eerste pagina tot het formulier dat een aanvraag opvangt. Jij kijkt mee op de momenten die ertoe doen.",
  },
  {
    title: "Laagdrempelig beginnen",
    text: "Een bericht is genoeg. Kennismaken verplicht tot niets. Een opdracht ontstaat pas na een voorstel dat je accepteert.",
  },
];

export const processSteps = [
  {
    n: "01",
    title: "Inzicht",
    text: "We leren het bedrijf kennen en bepalen wat er nodig is.",
  },
  {
    n: "02",
    title: "Richting",
    text: "Je krijgt een concrete scope en, als dat past, een voorstel.",
  },
  {
    n: "03",
    title: "Realisatie",
    text: "We ontwerpen en maken het. Jij kijkt mee op de momenten die ertoe doen.",
  },
  {
    n: "04",
    title: "Oplevering en vervolg",
    text: "Na akkoord leveren we op. Hosting, beheer of een volgende stap alleen als dat is afgesproken.",
  },
];

export const services = [
  {
    href: routes.websites,
    label: "Websites",
    title: "Websites",
    text: "Nieuwe websites, een bestaande site vernieuwen en maatwerk waar de standaard niet past.",
    result: "Een professionele online uitstraling die vertrouwen wekt en contact eenvoudig maakt.",
  },
  {
    href: routes.merk,
    label: "Merk & ontwerp",
    title: "Merk & ontwerp",
    text: "Merkidentiteit, huisstijl, een merkrefresh of een nieuwe visuele richting.",
    result: "Een herkenbare uitstraling die consequent wordt toegepast.",
  },
  {
    href: routes.marketing,
    label: "Marketing & activatie",
    title: "Marketing & activatie",
    text: "Presentaties, offertes, flyers, social formats, landingspagina’s en andere middelen.",
    result: "Middelen die een bedrijf daadwerkelijk kan gebruiken om zich sterker te presenteren.",
  },
  {
    href: routes.automatisering,
    label: "Automatisering & AI",
    title: "Automatisering & AI",
    text: "Terugkerend werk slimmer organiseren, systemen koppelen en AI inzetten waar dat helpt.",
    result: "Minder dubbel werk, minder handmatige handelingen en meer grip op processen.",
  },
];

export const propositions = services.map((item) => ({
  href: item.href,
  title: item.title,
  label: item.label,
  text: item.text,
  result: item.result,
  cta: "Bekijk de dienst",
}));

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
