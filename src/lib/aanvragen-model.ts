import type { ProductFit } from "@/lib/acquisition-constants";
import { formatBidAmount, isDomainLandingSource, parseDomainIntent } from "@/lib/domain-landing";
import { products } from "@/lib/site";

export const aanvraagStatuses = [
  { value: "NIEUW", label: "Nieuw" },
  { value: "MAATWERK_REVIEW", label: "Review nodig" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL_NEEDED", label: "Voorstel nodig" },
  { value: "IN_GESPREK", label: "In gesprek" },
  { value: "GEWONNEN", label: "Gewonnen" },
  { value: "VERLOREN", label: "Verloren" },
  { value: "OMGEZET", label: "Klant" },
  { value: "AFGEWEZEN", label: "Verloren" },
] as const;

export type AanvraagStatus = (typeof aanvraagStatuses)[number]["value"];

export const aanvraagFilters = [
  { value: "alles", label: "Alles" },
  { value: "nieuw", label: "Nieuw" },
  { value: "review", label: "Review nodig" },
  { value: "domein", label: "Domein" },
  { value: "standard", label: "Standard fit" },
  { value: "custom", label: "Custom fit" },
  { value: "voorstel", label: "Voorstel nodig" },
  { value: "gewonnen", label: "Gewonnen" },
  { value: "verloren", label: "Verloren" },
] as const;

export type AanvraagFilter = (typeof aanvraagFilters)[number]["value"];

export const proposalStatuses = [
  { value: "DRAFT", label: "Concept" },
  { value: "SENT", label: "Verzonden" },
  { value: "ACCEPTED", label: "Geaccepteerd" },
  { value: "REJECTED", label: "Afgewezen" },
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number]["value"];

export type AanvraagRecord = {
  id: string;
  created_at: string;
  type: string;
  status: string;
  company_name: string | null;
  website: string | null;
  name: string;
  email: string;
  phone: string | null;
  pages: string | null;
  has_brand: string | null;
  notes: string | null;
  request_detail: string | null;
  functionality: string | null;
  scale: string | null;
  timing: string | null;
  source: string | null;
  product_fit: ProductFit | null;
  prospect_id: string | null;
  next_action: string | null;
  next_action_at: string | null;
  call_notes: string | null;
  qualification_notes: string | null;
  payload: Record<string, unknown> | null;
  proposal_id: string | null;
  proposal_status: ProposalStatus | null;
};

export type ProposalLineInput = {
  title: string;
  description: string;
  amount_label: string;
  cadence: string;
  sort_order: number;
};

export type ProposalLineRecord = ProposalLineInput & {
  id: string;
  proposal_id: string;
};

export type ProposalRecord = {
  id: string;
  inbound_lead_id: string;
  status: ProposalStatus;
  product_fit: ProductFit | null;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lines: ProposalLineRecord[];
};

export type AanvraagActivity = {
  id: string;
  inbound_lead_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const AANVRAAG_ACTIVITY = {
  REQUEST_CREATED: "REQUEST_CREATED",
  STATUS_UPDATED: "STATUS_UPDATED",
  PRODUCT_FIT_SET: "PRODUCT_FIT_SET",
  CALL_NOTE_SAVED: "CALL_NOTE_SAVED",
  NEXT_ACTION_SET: "NEXT_ACTION_SET",
  PROPOSAL_CREATED: "PROPOSAL_CREATED",
  PROPOSAL_UPDATED: "PROPOSAL_UPDATED",
} as const;

const TERMINAL_STATUSES = new Set(["GEWONNEN", "VERLOREN", "OMGEZET", "AFGEWEZEN"]);
const REVIEW_STATUSES = new Set(["MAATWERK_REVIEW"]);
const WON_STATUSES = new Set(["GEWONNEN", "OMGEZET"]);
const LOST_STATUSES = new Set(["VERLOREN", "AFGEWEZEN"]);
const PROPOSAL_STATUSES = new Set(["QUALIFIED", "PROPOSAL_NEEDED", "IN_GESPREK"]);

export function isAanvraagStatus(value: string): value is AanvraagStatus {
  return aanvraagStatuses.some((item) => item.value === value);
}

export function isAanvraagFilter(value: string): value is AanvraagFilter {
  return aanvraagFilters.some((item) => item.value === value);
}

export function isProposalStatus(value: string): value is ProposalStatus {
  return proposalStatuses.some((item) => item.value === value);
}

export function defaultProductFitForSource(source: string, type?: string): ProductFit {
  if (source === "maatwerk" || type === "maatwerk") return "CUSTOM_FIT";
  if (source === "MANUAL" || source === "domain_landingspage") return "REVIEW_REQUIRED";
  return "STANDARD_FIT";
}

export function defaultStatusForSource(source: string, type?: string): AanvraagStatus {
  if (source === "maatwerk" || type === "maatwerk") return "MAATWERK_REVIEW";
  return "NIEUW";
}

export function inferredProductFit(row: Pick<AanvraagRecord, "product_fit" | "type" | "status">): ProductFit | null {
  if (row.product_fit) return row.product_fit;
  if (row.type === "maatwerk" || row.status === "MAATWERK_REVIEW") return "CUSTOM_FIT";
  if (row.type === "website") return "STANDARD_FIT";
  return null;
}

export function requestBron(row: Pick<AanvraagRecord, "source" | "payload">): string {
  const payloadSource = typeof row.payload?.source === "string" ? row.payload.source : "";
  const raw = payloadSource || row.source || "";
  return bronLabel(raw);
}

export function domainAanvraagFields(row: Pick<AanvraagRecord, "source" | "payload" | "website" | "request_detail" | "functionality" | "scale" | "notes">) {
  if (!isDomainLandingSource(row.source) && !isDomainLandingSource(typeof row.payload?.source === "string" ? row.payload.source : "")) {
    return null;
  }
  const payload = row.payload ?? {};
  const domain =
    (typeof payload.domain === "string" && payload.domain) ||
    domainFromWebsite(row.website) ||
    row.website ||
    "";
  const intent = parseDomainIntent(typeof payload.intent === "string" ? payload.intent : row.request_detail ?? "");
  const bidAmount = typeof payload.bid_amount === "number" ? payload.bid_amount : null;
  const wantsWebsite = payload.wants_website === true || row.scale === "website-interesse";
  return [
    ["Type", "Domeininteresse"],
    ["Bron", "Domeininteresse"],
    ["Domein", domain],
    ["Aanvraag", intent === "bid" ? "Bod" : "Prijsaanvraag"],
    ["Bod", bidAmount != null ? formatBidAmount(bidAmount) : row.functionality],
    ["Website interesse", wantsWebsite ? "Ja" : "Nee"],
    ["Toelichting", row.notes],
  ].filter(([, value]) => value);
}

export function bronLabel(source: string | null | undefined): string {
  const value = (source ?? "").trim();
  if (!value || value === "kopvast" || value === "website-aanvraag" || value === "aanvraag") return "Websiteformulier";
  if (value === "maatwerk") return "Maatwerkformulier";
  if (value === "MANUAL") return "Handmatig";
  if (value === "kopvast-acquisitie" || value === "acquisitie") return "Acquisitie";
  if (value === "websitecheck") return "Websitecheck";
  if (value === "domain_landingspage") return "Domeininteresse";
  return value;
}

export function domainFromWebsite(website: string | null | undefined): string {
  if (!website) return "";
  try {
    const url = website.includes("://") ? new URL(website) : new URL(`https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

export function matchesAanvraagSearch(
  row: Pick<AanvraagRecord, "company_name" | "name" | "email" | "website">,
  q: string
) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const domain = domainFromWebsite(row.website);
  const haystack = [row.company_name, row.name, row.email, row.website, domain]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesAanvraagFilter(
  row: Pick<AanvraagRecord, "status" | "product_fit" | "type" | "proposal_id" | "source" | "payload">,
  filter: AanvraagFilter
) {
  if (filter === "alles") return true;
  const fit = inferredProductFit(row);
  if (filter === "nieuw") return row.status === "NIEUW";
  if (filter === "review") return REVIEW_STATUSES.has(row.status) || fit === "REVIEW_REQUIRED";
  if (filter === "domein") return requestBron(row) === "Domeininteresse";
  if (filter === "standard") return fit === "STANDARD_FIT";
  if (filter === "custom") return fit === "CUSTOM_FIT";
  if (filter === "gewonnen") return WON_STATUSES.has(row.status);
  if (filter === "verloren") return LOST_STATUSES.has(row.status);
  if (filter === "voorstel") {
    if (row.proposal_id || TERMINAL_STATUSES.has(row.status)) return false;
    return PROPOSAL_STATUSES.has(row.status);
  }
  return true;
}

export function proposalLinesForFit(fit: ProductFit | null): ProposalLineInput[] {
  if (fit === "CUSTOM_FIT") {
    return [
      {
        title: "Maatwerk",
        description: "",
        amount_label: "",
        cadence: "",
        sort_order: 0,
      },
    ];
  }

  if (fit === "STANDARD_FIT") {
    return [
      {
        title: products.website.name,
        description: products.website.summary,
        amount_label: products.website.price,
        cadence: products.website.cadence,
        sort_order: 0,
      },
      {
        title: products.beheer.name,
        description: products.beheer.summary,
        amount_label: products.beheer.price,
        cadence: products.beheer.cadence,
        sort_order: 1,
      },
    ];
  }

  return [
    {
      title: "Voorstelregel",
      description: "",
      amount_label: "",
      cadence: "",
      sort_order: 0,
    },
  ];
}

export function existingDraftProposal<T extends { inbound_lead_id: string; status: string }>(
  proposals: T[],
  leadId: string
) {
  return proposals.find((item) => item.inbound_lead_id === leadId && item.status === "DRAFT") ?? null;
}

export function recentManualDuplicate<T extends { email: string; company_name: string | null; created_at: string; source?: string | null }>(
  rows: T[],
  input: { email: string; company: string },
  now = Date.now(),
  windowMs = 15_000
) {
  const email = input.email.trim().toLowerCase();
  const company = input.company.trim().toLowerCase();
  return (
    rows.find((item) => {
      if ((item.source ?? "MANUAL") !== "MANUAL") return false;
      if (item.email.trim().toLowerCase() !== email) return false;
      if ((item.company_name ?? "").trim().toLowerCase() !== company) return false;
      const created = Date.parse(item.created_at);
      return Number.isFinite(created) && now - created < windowMs;
    }) ?? null
  );
}

export function payloadRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
