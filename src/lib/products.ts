/**
 * Actuele commerciële catalogus.
 * Voorstel- en orderregels kopiëren hier een prijs uit; daarna is die snapshot de afspraak.
 */

export const WEBSITE_LIST_PRICE_EX_VAT = 1495;
export const REGIONAL_ACQUISITION_PRICE_EX_VAT = 995;

export type BillingType = "ONE_TIME" | "MONTHLY";

export type ProductCategory = "WEBSITE" | "HOSTING" | "MANAGEMENT" | "BRANDING" | "MARKETING" | "CUSTOM";

export type PriceType = "FIXED" | "FROM" | "CUSTOM";

export type CatalogProjectType =
  | "website"
  | "hosting"
  | "hosting_plus"
  | "beheer"
  | "merkrefresh"
  | "sjablonen"
  | "maatwerk";

export type ProductDefinition = {
  id: string;
  name: string;
  category: ProductCategory;
  billingType: BillingType;
  priceExVat: number | null;
  priceType: PriceType;
  public: boolean;
  description?: string;
  includes?: readonly string[];
  active: boolean;
  projectType: CatalogProjectType;
};

export type AcquisitionOffer = {
  id: string;
  productId: string;
  offerPriceExVat: number;
};

export const PRODUCT_CATALOG: readonly ProductDefinition[] = [
  {
    id: "website_standard",
    name: "Kopvast Website",
    category: "WEBSITE",
    billingType: "ONE_TIME",
    priceExVat: WEBSITE_LIST_PRICE_EX_VAT,
    priceType: "FIXED",
    public: true,
    active: true,
    projectType: "website",
    description:
      "Een professionele website met maximaal zes kernpagina’s, een herkenbare uitstraling en duidelijke contactmogelijkheden.",
  },
  {
    id: "hosting",
    name: "Kopvast Hosting",
    category: "HOSTING",
    billingType: "MONTHLY",
    priceExVat: 49.5,
    priceType: "FROM",
    public: true,
    active: true,
    projectType: "hosting",
    description: "Snel, veilig en door Kopvast beheerd. Geen gedoe met hostingpartijen, SSL of technische instellingen.",
    includes: [
      "hosting van de website",
      "SSL",
      "deployment",
      "technisch beschikbaar houden",
      "basis monitoring",
      "reguliere hostinginfrastructuur",
    ],
  },
  {
    id: "hosting_plus",
    name: "Kopvast Hosting Plus",
    category: "HOSTING",
    billingType: "MONTHLY",
    priceExVat: 99,
    priceType: "FIXED",
    public: true,
    active: true,
    projectType: "hosting_plus",
    description: "Hosting met uitgebreidere monitoring, een periodieke technische controle en kleine technische ondersteuning.",
    includes: [
      "hosting van de website",
      "SSL",
      "deployment",
      "technisch beschikbaar houden",
      "uitgebreidere monitoring",
      "periodieke technische controle",
      "kleine technische ondersteuning",
    ],
  },
  {
    id: "managed",
    name: "Kopvast Beheer",
    category: "MANAGEMENT",
    billingType: "MONTHLY",
    priceExVat: 199,
    priceType: "FIXED",
    public: true,
    active: true,
    projectType: "beheer",
    description:
      "Je website blijft technisch gezond, actueel en bruikbaar. Wij houden de basis op orde en zorgen dat kleine wijzigingen niet blijven liggen.",
    includes: [
      "hosting",
      "monitoring",
      "technisch onderhoud",
      "backups",
      "formuliercontrole",
      "twee kleine wijzigingen per maand",
      "periodieke websitecontrole",
      "toegang tot merkassets en bestanden",
    ],
  },
  {
    id: "merkrefresh",
    name: "Kopvast Merkrefresh",
    category: "BRANDING",
    billingType: "ONE_TIME",
    priceExVat: 995,
    priceType: "FIXED",
    public: true,
    active: true,
    projectType: "merkrefresh",
    description:
      "We behouden wat herkenbaar is en verbeteren wat beter kan. Geen onnodige rebranding, maar een sterkere en consistenter toepasbare uitstraling.",
  },
  {
    id: "templates",
    name: "Sjablonenpakket",
    category: "MARKETING",
    billingType: "ONE_TIME",
    priceExVat: 495,
    priceType: "FIXED",
    public: true,
    active: true,
    projectType: "sjablonen",
    description: "Offertes, presentaties, social formats, flyers en e-mailhandtekening in één herkenbare lijn.",
  },
  {
    id: "custom_website",
    name: "Maatwerk website",
    category: "CUSTOM",
    billingType: "ONE_TIME",
    priceExVat: null,
    priceType: "CUSTOM",
    public: false,
    active: true,
    projectType: "maatwerk",
    description: "Scope en prijs volgen het voorstel. Geen automatisch standaard- of acquisitietarief.",
  },
];

export const ACQUISITION_OFFERS: readonly AcquisitionOffer[] = [
  {
    id: "regional_acquisition_offer",
    productId: "website_standard",
    offerPriceExVat: REGIONAL_ACQUISITION_PRICE_EX_VAT,
  },
];

export const PROPOSAL_PRODUCT_IDS = [
  "website_standard",
  "hosting",
  "hosting_plus",
  "managed",
  "custom_website",
] as const;

export const RECURRING_PROJECT_TYPES = ["hosting", "hosting_plus", "beheer"] as const;

export type RecurringProjectType = (typeof RECURRING_PROJECT_TYPES)[number];

export function getProduct(id: string) {
  return PRODUCT_CATALOG.find((item) => item.id === id) ?? null;
}

export function getAcquisitionOffer(id: string) {
  return ACQUISITION_OFFERS.find((item) => item.id === id) ?? null;
}

export function activeProducts() {
  return PRODUCT_CATALOG.filter((item) => item.active);
}

export function proposalProductChoices() {
  return PROPOSAL_PRODUCT_IDS.map((id) => getProduct(id)).filter((item): item is ProductDefinition => Boolean(item));
}

export function publicRecurringProducts() {
  return PRODUCT_CATALOG.filter(
    (item) => item.public && item.active && item.billingType === "MONTHLY"
  );
}

export function isRecurringServiceType(type: string): type is RecurringProjectType {
  return (RECURRING_PROJECT_TYPES as readonly string[]).includes(type);
}

export function productForProjectType(type: string) {
  return (
    PRODUCT_CATALOG.find((item) => item.projectType === type && item.priceType !== "CUSTOM") ??
    PRODUCT_CATALOG.find((item) => item.projectType === type) ??
    null
  );
}

export function oneTimeAmountForProjectType(type: string) {
  const product = PRODUCT_CATALOG.find(
    (item) => item.projectType === type && item.billingType === "ONE_TIME" && item.priceType === "FIXED"
  );
  return product?.priceExVat ?? null;
}

export function recurringAmountForProjectType(type: string) {
  const product = PRODUCT_CATALOG.find(
    (item) => item.projectType === type && item.billingType === "MONTHLY" && item.priceExVat != null
  );
  return product?.priceExVat ?? null;
}

export function productForLine(input: { productId?: string | null; title?: string | null }) {
  if (input.productId) {
    const byId = getProduct(input.productId);
    if (byId) return byId;
  }
  const title = input.title?.trim().toLowerCase();
  if (!title) return null;
  return PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === title) ?? null;
}

export function formatPrice(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const cents = Math.round(Math.abs(amount) * 100);
  const hasFraction = cents % 100 !== 0;
  const formatted = new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
  return `€${formatted}`;
}

export function priceInputValue(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return "";
  const hasFraction = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
    useGrouping: false,
  }).format(amount);
}

export function priceCadence(product: Pick<ProductDefinition, "billingType" | "priceType">) {
  if (product.priceType === "CUSTOM") return "offerte";
  if (product.billingType === "MONTHLY") return "per maand, excl. btw";
  return "eenmalig, excl. btw";
}

export function commercialPriceLabel(product: ProductDefinition) {
  if (product.priceExVat == null) return "Op aanvraag";
  const price = formatPrice(product.priceExVat);
  if (product.billingType === "MONTHLY" && product.priceType === "FROM") {
    return `vanaf ${price} per maand excl. btw`;
  }
  if (product.billingType === "MONTHLY") return `${price} per maand excl. btw`;
  return `${price} excl. btw`;
}

export function standardWebsitePriceSentence() {
  const product = getProduct("website_standard");
  return `Een complete Kopvast Website kost ${formatPrice(product?.priceExVat)} excl. btw.`;
}

export function acquisitionOfferLeadSentences() {
  const list = formatPrice(getProduct("website_standard")?.priceExVat);
  const offer = formatPrice(getAcquisitionOffer("regional_acquisition_offer")?.offerPriceExVat);
  return {
    normal: `Een complete Kopvast Website kost normaal ${list} excl. btw.`,
    offer: `Voor jullie maak ik daar ${offer} excl. btw. van.`,
  };
}

export type ProposalCatalogLine = {
  productId: string;
  kind: "scope" | "recurring";
  title: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export function proposalLineFromProduct(
  product: ProductDefinition,
  override?: { unitPriceExVat?: number | null; quantity?: number }
): ProposalCatalogLine {
  const price = override && "unitPriceExVat" in override ? override.unitPriceExVat : product.priceExVat;
  return {
    productId: product.id,
    kind: product.billingType === "MONTHLY" ? "recurring" : "scope",
    title: product.name,
    description: product.description ?? "",
    quantity: override?.quantity && override.quantity > 0 ? override.quantity : 1,
    unitPriceCents: price == null ? 0 : Math.round(price * 100),
  };
}

export function recurringLivePatch<T extends {
  type: string;
  status: string;
  monthly_amount: number | null;
  started_at: string | null;
  live_at: string | null;
}>(project: T, liveDate: string, fallbackAmount: number | null) {
  if (!isRecurringServiceType(project.type)) return null;
  if (project.status === "opgezegd" || project.status === "gepauzeerd" || project.status === "live") return null;
  return {
    status: "live" as const,
    live_at: project.live_at || liveDate,
    started_at: project.started_at || liveDate,
    monthly_amount: project.monthly_amount ?? fallbackAmount,
  };
}
