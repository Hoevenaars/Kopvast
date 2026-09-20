import type { RefreshStatus } from "./acquire-map";

export const SCANNER_VERSION = "kopvast-1.0";
export const SCORE_VERSION = "v1.1.0";
export const MAIL_PROMPT_VERSION = "kopvast-acquisition-mail-v3";
export const MAIL_TEMPLATE_VERSION = "acquisition-outreach-v3";
export const PUBLIC_CHECK_PATH = "/check";

export const DEFAULT_SCORE_THRESHOLDS = {
  rejectedMax: 49,
  watchlistMax: 64,
  qualifiedMax: 79,
  salesReadyMax: 89,
} as const;

export type ScoreThresholds = {
  rejectedMax: number;
  watchlistMax: number;
  qualifiedMax: number;
  salesReadyMax: number;
};

export const SCORE_WEIGHTS = {
  websiteImprovement: 35,
  commercialFit: 30,
  productFit: 25,
  evidenceQuality: 10,
} as const;

export const productFits = [
  { value: "STANDARD_FIT", label: "Standaard" },
  { value: "CUSTOM_FIT", label: "Maatwerk" },
  { value: "NOT_FIT", label: "Geen fit" },
  { value: "REVIEW_REQUIRED", label: "Beoordelen" },
] as const;

export type ProductFit = (typeof productFits)[number]["value"];

export const contactStatuses = [
  { value: "UNKNOWN", label: "Onbekend" },
  { value: "CONSENTED", label: "Toestemming" },
  { value: "EXISTING_CUSTOMER", label: "Bestaande klant" },
  { value: "OTHER_VALID_BASIS", label: "Andere grondslag" },
  { value: "DO_NOT_CONTACT", label: "Niet benaderen" },
  { value: "BLOCKED", label: "Geblokkeerd" },
] as const;

export type ContactStatus = (typeof contactStatuses)[number]["value"];

export const mailStatuses = [
  { value: "none", label: "Geen" },
  { value: "draft", label: "Concept" },
  { value: "queued", label: "In wachtrij" },
  { value: "sent", label: "Verzonden" },
  { value: "delivered", label: "Afgeleverd" },
  { value: "bounced", label: "Bounced" },
  { value: "failed", label: "Mislukt" },
  { value: "cancelled", label: "Geannuleerd" },
] as const;

export type MailStatus = (typeof mailStatuses)[number]["value"];

export const responseStatuses = [
  { value: "NO_RESPONSE", label: "Geen reactie" },
  { value: "POSITIVE", label: "Positief" },
  { value: "QUESTION", label: "Vraag" },
  { value: "MEETING", label: "Gesprek" },
  { value: "NOT_INTERESTED", label: "Geen interesse" },
  { value: "UNSUBSCRIBED", label: "Afgemeld" },
] as const;

export type ResponseStatus = (typeof responseStatuses)[number]["value"];

export const prospectStatuses = [
  { value: "NEW", label: "Nieuw" },
  { value: "VALIDATING", label: "Valideren" },
  { value: "SCANNING", label: "Scannen" },
  { value: "SCAN_FAILED", label: "Scan mislukt" },
  { value: "ANALYSING", label: "Analyseren" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "WATCHLIST", label: "Watchlist" },
  { value: "SALES_READY", label: "Sales ready" },
  { value: "PRIORITY", label: "Priority" },
  { value: "REJECTED", label: "Afgewezen" },
  { value: "PREVIEW_READY", label: "Preview klaar" },
  { value: "ARCHIVED", label: "Gearchiveerd" },
  { value: "CONVERTED", label: "Lead" },
] as const;

export type ProspectStatus = (typeof prospectStatuses)[number]["value"];

export const acquisitionFilters = [
  { value: "alles", label: "Alles" },
  { value: "nieuw", label: "Nieuw" },
  { value: "scout", label: "Scout" },
  { value: "scan", label: "Scan gereed" },
  { value: "sales", label: "Sales ready" },
  { value: "concept", label: "Concept klaar" },
  { value: "verzonden", label: "Verzonden" },
  { value: "reactie", label: "Reactie" },
  { value: "geconverteerd", label: "Geconverteerd" },
  { value: "geblokkeerd", label: "Geblokkeerd" },
] as const;

export type AcquisitionFilter = (typeof acquisitionFilters)[number]["value"];

export const acquisitionSorts = [
  { value: "score", label: "Hoogste score" },
  { value: "nieuwste", label: "Nieuwste" },
  { value: "activiteit", label: "Laatste activiteit" },
  { value: "status", label: "Status" },
] as const;

export type AcquisitionSort = (typeof acquisitionSorts)[number]["value"];

export const suppressionReasons = [
  { value: "UNSUBSCRIBED", label: "Afgemeld" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "COMPLAINT", label: "Klacht" },
  { value: "MANUAL_BLOCK", label: "Handmatig" },
  { value: "LEGAL_BLOCK", label: "Juridisch" },
] as const;

export type SuppressionReason = (typeof suppressionReasons)[number]["value"];

export const SCAN_STEPS = [
  { key: "reachable", label: "Website bereikbaar" },
  { key: "scanned", label: "Technische scan uitgevoerd" },
  { key: "content", label: "Content geanalyseerd" },
  { key: "findings", label: "Verbeterpunten bepaald" },
  { key: "fit", label: "Product Fit bepaald" },
  { key: "score", label: "Opportunity Score berekend" },
  { key: "mail", label: "Acquisitiemail voorbereid" },
] as const;

export type ScanStepKey = (typeof SCAN_STEPS)[number]["key"];

export type ScanStepState = "pending" | "done" | "failed";

export type ScanProgressStep = {
  key: ScanStepKey;
  label: string;
  status: ScanStepState;
  at?: string;
};

export const ACTIVITY = {
  PROSPECT_CREATED: "PROSPECT_CREATED",
  PROSPECT_REUSED: "PROSPECT_REUSED",
  SCAN_STARTED: "SCAN_STARTED",
  SCAN_COMPLETED: "SCAN_COMPLETED",
  SCAN_FAILED: "SCAN_FAILED",
  ANALYSIS_COMPLETED: "ANALYSIS_COMPLETED",
  SCORE_CALCULATED: "SCORE_CALCULATED",
  PRODUCT_FIT_SET: "PRODUCT_FIT_SET",
  MAIL_GENERATED: "MAIL_GENERATED",
  MAIL_EDITED: "MAIL_EDITED",
  TEST_MAIL_SENT: "TEST_MAIL_SENT",
  MAIL_QUEUED: "MAIL_QUEUED",
  MAIL_SENT: "MAIL_SENT",
  MAIL_CLICKED: "MAIL_CLICKED",
  MAIL_DELIVERED: "MAIL_DELIVERED",
  MAIL_BOUNCED: "MAIL_BOUNCED",
  MAIL_FAILED: "MAIL_FAILED",
  RESPONSE_UPDATED: "RESPONSE_UPDATED",
  NEXT_ACTION_SET: "NEXT_ACTION_SET",
  PROSPECT_BLOCKED: "PROSPECT_BLOCKED",
  PROSPECT_CONVERTED: "PROSPECT_CONVERTED",
  CONTACT_UPDATED: "CONTACT_UPDATED",
} as const;

export const FINDING_CATEGORY_LABELS: Record<string, string> = {
  mobile: "Mobiele presentatie",
  visual: "Uitstraling",
  commercial: "Positionering",
  content: "Content",
  conversion: "Contactroute",
  trust: "Vertrouwen",
  seo: "Vindbaarheid",
  performance: "Snelheid",
  accessibility: "Toegankelijkheid",
  technical: "Techniek",
  navigation: "Navigatie",
  complexity: "Complexiteit",
};

export const FORBIDDEN_MAIL_CLAIMS = [
  /verliezen omzet/i,
  /verliest omzet/i,
  /verliezen klanten/i,
  /verliest klanten/i,
  /conversie is slecht/i,
  /website kost geld/i,
  /3x meer leads/i,
  /drie keer meer/i,
  /concurrenten doen dit beter/i,
  /garanderen meer aanvragen/i,
  /meer leads gegarandeerd/i,
];

export const CONTACT_STATUSES_ALLOWED_TO_SEND: ContactStatus[] = [
  "UNKNOWN",
  "CONSENTED",
  "EXISTING_CUSTOMER",
  "OTHER_VALID_BASIS",
];

export const BLOCKING_CONTACT_STATUSES: ContactStatus[] = ["DO_NOT_CONTACT", "BLOCKED"];

export function isProductFit(value: string): value is ProductFit {
  return productFits.some((item) => item.value === value);
}

export function isResponseStatus(value: string): value is ResponseStatus {
  return responseStatuses.some((item) => item.value === value);
}

export function isContactStatus(value: string): value is ContactStatus {
  return contactStatuses.some((item) => item.value === value);
}

export function isAcquisitionFilter(value: string): value is AcquisitionFilter {
  return acquisitionFilters.some((item) => item.value === value);
}

export function isAcquisitionSort(value: string): value is AcquisitionSort {
  return acquisitionSorts.some((item) => item.value === value);
}

export function emptyScanProgress(): ScanProgressStep[] {
  return SCAN_STEPS.map((step) => ({ ...step, status: "pending" }));
}

export function statusFromScore(score: number, thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS): RefreshStatus {
  if (score <= thresholds.rejectedMax) return "REJECTED";
  if (score <= thresholds.watchlistMax) return "WATCHLIST";
  if (score <= thresholds.qualifiedMax) return "QUALIFIED";
  if (score <= thresholds.salesReadyMax) return "SALES_READY";
  return "PRIORITY";
}

/** Score remains a ranking signal for later automation. Human admin work never treats a low score as "don't contact". */
export function adminStatusFromScore(status: RefreshStatus): RefreshStatus {
  return status === "REJECTED" ? "WATCHLIST" : status;
}

export function labelForStatus(status: string) {
  return prospectStatuses.find((item) => item.value === status)?.label ?? status;
}

export function labelForFit(fit: string | null | undefined) {
  return productFits.find((item) => item.value === fit)?.label ?? fit ?? "—";
}

export function labelForMail(status: string | null | undefined) {
  return mailStatuses.find((item) => item.value === status)?.label ?? status ?? "—";
}

export function labelForResponse(status: string | null | undefined) {
  return responseStatuses.find((item) => item.value === status)?.label ?? status ?? "—";
}

export function labelForContact(status: string | null | undefined) {
  return contactStatuses.find((item) => item.value === status)?.label ?? status ?? "—";
}

export function formatNlDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function pickCommercialFindings<T extends { finding_type: string; severity: string }>(
  findings: T[],
  limit = 5
): T[] {
  const typeRank = (value: string) => (value === "FACT" ? 0 : value === "OBSERVATION" ? 1 : 2);
  const severityRank = (value: string) => (value === "critical" ? 0 : value === "important" ? 1 : 2);
  return [...findings]
    .sort((a, b) => typeRank(a.finding_type) - typeRank(b.finding_type) || severityRank(a.severity) - severityRank(b.severity))
    .slice(0, limit);
}

export function publicCheckUrl(token: string, origin = "https://kopvast.nl") {
  return `${origin}${PUBLIC_CHECK_PATH}/${token}`;
}
