export const SCOUT_SOURCES = [
  "scout_manual",
  "safari_share",
  "camera",
  "nearby",
  "prospect_scanner",
  "import",
  "shortcut",
  "clipboard",
] as const;

export type ScoutSource = (typeof SCOUT_SOURCES)[number];

export const SCOUT_STATUSES = [
  "nieuw",
  "scannen",
  "geanalyseerd",
  "concept_klaar",
  "benaderd",
  "reactie",
  "kans",
  "gewonnen",
  "afgevallen",
  "scan_mislukt",
] as const;

export type ScoutStatus = (typeof SCOUT_STATUSES)[number];

export const SCOUT_STATUS_LABELS: Record<ScoutStatus, string> = {
  nieuw: "Nieuw",
  scannen: "Scannen",
  geanalyseerd: "Geanalyseerd",
  concept_klaar: "Concept klaar",
  benaderd: "Benaderd",
  reactie: "Reactie",
  kans: "Kans",
  gewonnen: "Gewonnen",
  afgevallen: "Afgevallen",
  scan_mislukt: "Scan mislukt",
};

export const SCOUT_EVENTS = [
  "lead_created",
  "scan_started",
  "scan_completed",
  "scan_failed",
  "draft_generated",
  "draft_modified",
  "draft_approved",
  "contacted",
  "response_received",
  "opportunity_created",
  "won",
  "lost",
  "email_sent",
  "rescan_requested",
  "contact_updated",
] as const;

export type ScoutEventType = (typeof SCOUT_EVENTS)[number];

export type EvidenceKind = "found" | "inferred";

export type EnrichmentField<T> = {
  value: T | null;
  kind: EvidenceKind | "unknown";
};

export type ScoutEnrichment = {
  company_name: EnrichmentField<string>;
  domain: EnrichmentField<string>;
  canonical_url: EnrichmentField<string>;
  industry: EnrichmentField<string>;
  city: EnrichmentField<string>;
  description: EnrichmentField<string>;
  email: EnrichmentField<string>;
  phone: EnrichmentField<string>;
  linkedin_url: EnrichmentField<string>;
};

export type ScoutFinding = {
  dimension: "technical" | "conversion" | "design" | "brand" | "content";
  kind: EvidenceKind;
  title: string;
  detail: string;
  evidence: string;
};

export type ScoutOpportunity = {
  title: string;
  detail: string;
};

export type DimensionScores = {
  technical: number;
  conversion: number;
  design: number;
  brand: number;
  content: number;
  overall: number;
};

export type ScoutUser = {
  id: string;
  email: string;
};

export type ScoutLead = {
  id: string;
  user_id: string;
  url: string;
  domain: string;
  canonical_url: string | null;
  company_name: string | null;
  note: string | null;
  industry: string | null;
  city: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: ScoutSource;
  status: ScoutStatus;
  pipeline_stage: string;
  score: number | null;
  why_interesting: string | null;
  commercial_summary: string | null;
  biggest_opportunity: string | null;
  opportunities: ScoutOpportunity[];
  enrichment: ScoutEnrichment | Record<string, unknown>;
  prospect_id: string | null;
  last_scan_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoutScan = {
  id: string;
  lead_id: string;
  technical_score: number | null;
  conversion_score: number | null;
  design_score: number | null;
  brand_score: number | null;
  content_score: number | null;
  overall_score: number | null;
  findings: ScoutFinding[];
  opportunities: ScoutOpportunity[];
  commercial_summary: string | null;
  raw_scan_data: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
};

export type ScoutDraft = {
  id: string;
  lead_id: string;
  subject: string | null;
  message: string | null;
  channel: "email" | "linkedin" | "other";
  status: "draft" | "approved" | "sent";
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoutLeadEvent = {
  id: string;
  lead_id: string;
  event_type: ScoutEventType;
  actor_type: "system" | "human" | "agent";
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DuplicateLead = {
  id: string;
  company_name: string | null;
  domain: string;
  status: ScoutStatus | string;
  score: number | null;
  last_scan_at: string | null;
};

export type PushLeadResult =
  | { ok: true; leadId: string; duplicate?: false }
  | { ok: false; message: string }
  | { ok: false; duplicate: true; existing: DuplicateLead };

export function isScoutSource(value: string): value is ScoutSource {
  return (SCOUT_SOURCES as readonly string[]).includes(value);
}

export function isScoutStatus(value: string): value is ScoutStatus {
  return (SCOUT_STATUSES as readonly string[]).includes(value);
}

export function emptyEnrichment(): ScoutEnrichment {
  const unknown = { value: null, kind: "unknown" as const };
  return {
    company_name: { ...unknown },
    domain: { ...unknown },
    canonical_url: { ...unknown },
    industry: { ...unknown },
    city: { ...unknown },
    description: { ...unknown },
    email: { ...unknown },
    phone: { ...unknown },
    linkedin_url: { ...unknown },
  };
}
