import { labelFor, projectStatuses, projectTypes, requestStatuses } from "@/lib/product";

export const customerFilters = [
  { value: "alles", label: "Alles" },
  { value: "actief", label: "Actief" },
  { value: "onboarding", label: "Onboarding" },
  { value: "productie", label: "Productie" },
  { value: "live", label: "Live" },
  { value: "beheer", label: "Beheer" },
  { value: "support", label: "Open support" },
] as const;

export type CustomerFilter = (typeof customerFilters)[number]["value"];

export const customerTabs = [
  { value: "overzicht", label: "Overzicht" },
  { value: "contact", label: "Contact" },
  { value: "aanvragen", label: "Aanvragen" },
  { value: "voorstellen", label: "Voorstellen" },
  { value: "opdrachten", label: "Opdrachten" },
  { value: "website", label: "Website" },
  { value: "merk", label: "Merk" },
  { value: "bestanden", label: "Bestanden" },
  { value: "facturen", label: "Facturen" },
  { value: "wijzigingen", label: "Wijzigingen" },
  { value: "activiteit", label: "Activiteit" },
] as const;

export type CustomerTab = (typeof customerTabs)[number]["value"];

export const proposalStatuses = [
  { value: "concept", label: "Concept" },
  { value: "verstuurd", label: "Verstuurd" },
  { value: "geaccepteerd", label: "Geaccepteerd" },
  { value: "afgewezen", label: "Afgewezen" },
  { value: "review", label: "Handmatige review" },
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number]["value"];

export const invoiceStatuses = [
  { value: "concept", label: "Concept" },
  { value: "verstuurd", label: "Verstuurd" },
  { value: "betaald", label: "Betaald" },
  { value: "vervallen", label: "Vervallen" },
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number]["value"];

export const supportStatuses = [
  { value: "open", label: "Open" },
  { value: "in_behandeling", label: "In behandeling" },
  { value: "wacht_op_klant", label: "Wacht op klant" },
  { value: "klaar", label: "Klaar" },
] as const;

export type SupportStatus = (typeof supportStatuses)[number]["value"];

export const activitySources = [
  { value: "prospect", label: "Prospect" },
  { value: "request", label: "Aanvraag" },
  { value: "proposal", label: "Voorstel" },
  { value: "order", label: "Opdracht" },
  { value: "onboarding", label: "Onboarding" },
  { value: "website", label: "Website" },
  { value: "invoice", label: "Factuur" },
  { value: "support", label: "Support" },
  { value: "note", label: "Notitie" },
  { value: "lead", label: "Lead" },
  { value: "system", label: "Systeem" },
] as const;

export type ActivitySource = (typeof activitySources)[number]["value"];

export const ACTIVE_PROJECT_STATUSES = ["voorbereiding", "in_uitvoering", "wacht_op_klant"] as const;
export const LIVE_PROJECT_STATUSES = ["live"] as const;
export const OPEN_REQUEST_STATUSES = ["nieuw", "in_behandeling", "wacht_op_klant"] as const;
export const OPEN_SUPPORT_STATUSES = ["open", "in_behandeling", "wacht_op_klant"] as const;
export const OPEN_INVOICE_STATUSES = ["concept", "verstuurd", "vervallen"] as const;
export const OPEN_PROPOSAL_STATUSES = ["concept", "verstuurd"] as const;
export const BEHEER_ACTIVE_STATUSES = ["voorbereiding", "in_uitvoering", "wacht_op_klant", "opgeleverd", "live"] as const;

export type ProposalRow = {
  id: string;
  organization_id: string | null;
  inbound_lead_id: string | null;
  prospect_id: string | null;
  title: string;
  body: string | null;
  status: ProposalStatus;
  product_type: string;
  amount_label: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  website: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  number: string | null;
  title: string;
  amount_label: string | null;
  status: InvoiceStatus;
  issued_at: string | null;
  due_at: string | null;
  created_at: string;
};

export type NoteRow = {
  id: string;
  organization_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type SupportRow = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
};

export type BrandProfileRow = {
  organization_id: string;
  name: string | null;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  typography: string | null;
  tone: string | null;
  notes: string | null;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  organization_id: string;
  source: ActivitySource;
  event_type: string;
  title: string;
  detail: string | null;
  actor_email: string | null;
  related_id: string | null;
  created_at: string;
};

export type CustomerReviewRow = {
  id: string;
  proposal_id: string;
  candidate_organization_id: string;
  reason: string;
  status: "open" | "merged" | "kept_separate";
  created_at: string;
};

export type CustomerMatchOrg = {
  id: string;
  name: string;
  website: string | null;
  inbound_lead_id: string | null;
  prospect_id: string | null;
  memberEmails: string[];
};

export type CustomerMatchInput = {
  organizationId?: string | null;
  inboundLeadId?: string | null;
  prospectId?: string | null;
  email?: string | null;
  website?: string | null;
  companyName?: string | null;
};

export type CustomerMatchResult =
  | { kind: "linked"; organizationId: string }
  | { kind: "unique"; organizationId: string; reason: "lead" | "prospect" | "email" | "website" }
  | { kind: "none" }
  | { kind: "review"; candidates: Array<{ id: string; name: string; reason: string }> };

export type NextActionInput = {
  reviews: Array<{ status: string }>;
  support: Array<{ status: string; title: string }>;
  requests: Array<{ status: string; title: string }>;
  projects: Array<{ status: string; title: string }>;
  proposals: Array<{ status: string; title: string }>;
  invoices: Array<{ status: string; title: string }>;
  todos?: Array<{ status: string; title: string }>;
  organizationStatus: string;
};

export type CustomerListFacts = {
  contactName: string | null;
  contactEmail: string | null;
  website: string | null;
  activeOrder: string | null;
  beheerActive: boolean;
  nextAction: string | null;
  openSupport: boolean;
  inProduction: boolean;
  isLive: boolean;
};

export function isCustomerFilter(value: string): value is CustomerFilter {
  return customerFilters.some((item) => item.value === value);
}

export function isCustomerTab(value: string): value is CustomerTab {
  return customerTabs.some((item) => item.value === value);
}

export function isProposalStatus(value: string): value is ProposalStatus {
  return proposalStatuses.some((item) => item.value === value);
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return invoiceStatuses.some((item) => item.value === value);
}

export function isSupportStatus(value: string): value is SupportStatus {
  return supportStatuses.some((item) => item.value === value);
}

export function isActivitySource(value: string): value is ActivitySource {
  return activitySources.some((item) => item.value === value);
}

export function normalizeWebsiteHost(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    return host || null;
  } catch {
    return raw
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.trim() || null;
  }
}

export function normalizeCompanyName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveCustomerMatch(input: CustomerMatchInput, orgs: CustomerMatchOrg[]): CustomerMatchResult {
  if (input.organizationId) {
    const linked = orgs.find((item) => item.id === input.organizationId);
    if (linked) return { kind: "linked", organizationId: linked.id };
  }

  const email = input.email?.trim().toLowerCase() || null;
  const host = normalizeWebsiteHost(input.website);
  const hits = new Map<string, { id: string; name: string; reasons: string[] }>();

  function add(org: CustomerMatchOrg, reason: string) {
    const current = hits.get(org.id);
    if (current) {
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
      return;
    }
    hits.set(org.id, { id: org.id, name: org.name, reasons: [reason] });
  }

  for (const org of orgs) {
    if (input.inboundLeadId && org.inbound_lead_id === input.inboundLeadId) add(org, "lead");
    if (input.prospectId && org.prospect_id === input.prospectId) add(org, "prospect");
    if (email && org.memberEmails.some((item) => item === email)) add(org, "email");
    if (host && normalizeWebsiteHost(org.website) === host) add(org, "website");
  }

  if (hits.size === 1) {
    const [match] = hits.values();
    const reason = (["lead", "prospect", "email", "website"] as const).find((item) => match.reasons.includes(item));
    return { kind: "unique", organizationId: match.id, reason: reason ?? "email" };
  }

  if (hits.size > 1) {
    return {
      kind: "review",
      candidates: [...hits.values()].map((item) => ({
        id: item.id,
        name: item.name,
        reason: item.reasons.join(", "),
      })),
    };
  }

  const company = normalizeCompanyName(input.companyName);
  if (company) {
    const named = orgs.filter((org) => normalizeCompanyName(org.name) === company);
    if (named.length > 0) {
      return {
        kind: "review",
        candidates: named.map((org) => ({ id: org.id, name: org.name, reason: "gelijknamig bedrijf" })),
      };
    }
  }

  return { kind: "none" };
}

export function activeOrderTitle(projects: Array<{ type: string; status: string; title: string }>) {
  const active = projects.find((item) => (ACTIVE_PROJECT_STATUSES as readonly string[]).includes(item.status));
  if (active) return active.title;
  const live = projects.find((item) => item.status === "live");
  return live?.title ?? null;
}

export function isBeheerActive(projects: Array<{ type: string; status: string }>) {
  return projects.some(
    (item) => item.type === "beheer" && (BEHEER_ACTIVE_STATUSES as readonly string[]).includes(item.status)
  );
}

export function isInProduction(projects: Array<{ status: string }>) {
  return projects.some((item) => item.status === "in_uitvoering" || item.status === "wacht_op_klant");
}

export function isLiveCustomer(projects: Array<{ status: string }>) {
  return projects.some((item) => item.status === "live");
}

export function hasOpenSupport(
  support: Array<{ status: string }>,
  requests: Array<{ status: string }> = []
) {
  return (
    support.some((item) => (OPEN_SUPPORT_STATUSES as readonly string[]).includes(item.status)) ||
    requests.some((item) => (OPEN_REQUEST_STATUSES as readonly string[]).includes(item.status))
  );
}

export function nextActionLabel(input: NextActionInput) {
  const openReview = input.reviews.find((item) => item.status === "open");
  if (openReview) return "Dubbele klant beoordelen";

  const support = input.support.find((item) => (OPEN_SUPPORT_STATUSES as readonly string[]).includes(item.status));
  if (support) return `Support: ${support.title}`;

  const request = input.requests.find((item) => (OPEN_REQUEST_STATUSES as readonly string[]).includes(item.status));
  if (request) return `Wijziging: ${request.title}`;

  const waiting = input.projects.find((item) => item.status === "wacht_op_klant");
  if (waiting) return `Wacht op klant: ${waiting.title}`;

  const production = input.projects.find((item) => item.status === "in_uitvoering");
  if (production) return `Opdracht loopt: ${production.title}`;

  const proposal = input.proposals.find((item) => (OPEN_PROPOSAL_STATUSES as readonly string[]).includes(item.status));
  if (proposal) return `Voorstel: ${proposal.title}`;

  const invoice = input.invoices.find((item) => (OPEN_INVOICE_STATUSES as readonly string[]).includes(item.status));
  if (invoice) return `Factuur: ${invoice.title}`;

  const todo = input.todos?.find((item) => item.status === "open");
  if (todo) return `Taak: ${todo.title}`;

  if (input.organizationStatus === "onboarding") return "Rond onboarding af";
  return null;
}

export function customerMatchesFilter(
  filter: CustomerFilter,
  facts: Pick<CustomerListFacts, "beheerActive" | "openSupport" | "inProduction" | "isLive"> & {
    status: string;
  }
) {
  if (filter === "alles") return true;
  if (filter === "actief") return facts.status === "active";
  if (filter === "onboarding") return facts.status === "onboarding";
  if (filter === "productie") return facts.inProduction;
  if (filter === "live") return facts.isLive;
  if (filter === "beheer") return facts.beheerActive;
  if (filter === "support") return facts.openSupport;
  return true;
}

export function customerSearchHaystack(input: {
  name: string;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
}) {
  return [input.name, input.website, input.contactName, input.contactEmail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function listFactsForCustomer(input: {
  organization: { status: string; website: string | null };
  members: Array<{ name: string; email: string; role: string }>;
  projects: Array<{ type: string; status: string; title: string }>;
  requests: Array<{ status: string; title: string }>;
  support: Array<{ status: string; title: string }>;
  proposals: Array<{ status: string; title: string }>;
  invoices: Array<{ status: string; title: string }>;
  reviews?: Array<{ status: string }>;
  todos?: Array<{ status: string; title: string }>;
}): CustomerListFacts {
  const owner = input.members.find((item) => item.role === "owner") ?? input.members[0] ?? null;
  return {
    contactName: owner?.name ?? null,
    contactEmail: owner?.email ?? null,
    website: input.organization.website,
    activeOrder: activeOrderTitle(input.projects),
    beheerActive: isBeheerActive(input.projects),
    nextAction: nextActionLabel({
      reviews: input.reviews ?? [],
      support: input.support,
      requests: input.requests,
      projects: input.projects,
      proposals: input.proposals,
      invoices: input.invoices,
      todos: input.todos,
      organizationStatus: input.organization.status,
    }),
    openSupport: hasOpenSupport(input.support, input.requests),
    inProduction: isInProduction(input.projects),
    isLive: isLiveCustomer(input.projects),
  };
}

export function mergeActivity(rows: ActivityRow[]) {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((row) => {
      const key = `${row.source}:${row.related_id ?? ""}:${row.event_type}:${row.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function activityFromRecords(input: {
  organizationId: string;
  organization: { created_at: string; status: string; name: string };
  leads: Array<{ id: string; created_at: string; company_name: string | null; name: string; status: string }>;
  proposals: Array<{ id: string; title: string; status: ProposalStatus; created_at: string; accepted_at: string | null }>;
  projects: Array<{ id: string; title: string; status: string; type: string; created_at: string }>;
  requests: Array<{ id: string; title: string; status: string; created_at: string }>;
  invoices: Array<{ id: string; title: string; status: InvoiceStatus; created_at: string }>;
  support: Array<{ id: string; title: string; status: SupportStatus; created_at: string }>;
  notes: Array<{ id: string; body: string; created_at: string }>;
}): ActivityRow[] {
  const rows: ActivityRow[] = [
    {
      id: `onboarding-${input.organizationId}`,
      organization_id: input.organizationId,
      source: "onboarding",
      event_type: "CUSTOMER_CREATED",
      title: `${input.organization.name} is klant`,
      detail: `Status: ${input.organization.status}`,
      actor_email: null,
      related_id: input.organizationId,
      created_at: input.organization.created_at,
    },
  ];

  for (const lead of input.leads) {
    rows.push({
      id: `lead-${lead.id}`,
      organization_id: input.organizationId,
      source: "request",
      event_type: "LEAD_LINKED",
      title: `Aanvraag ${lead.company_name || lead.name}`,
      detail: lead.status,
      actor_email: null,
      related_id: lead.id,
      created_at: lead.created_at,
    });
  }

  for (const proposal of input.proposals) {
    rows.push({
      id: `proposal-${proposal.id}`,
      organization_id: input.organizationId,
      source: "proposal",
      event_type: proposal.status === "geaccepteerd" ? "PROPOSAL_ACCEPTED" : "PROPOSAL_UPDATED",
      title: proposal.title,
      detail: labelFor(proposalStatuses, proposal.status),
      actor_email: null,
      related_id: proposal.id,
      created_at: proposal.accepted_at || proposal.created_at,
    });
  }

  for (const project of input.projects) {
    rows.push({
      id: `order-${project.id}`,
      organization_id: input.organizationId,
      source: project.type === "website" || project.type === "beheer" ? "website" : "order",
      event_type: "ORDER_UPDATED",
      title: project.title,
      detail: `${labelFor(projectTypes, project.type)} · ${labelFor(projectStatuses, project.status)}`,
      actor_email: null,
      related_id: project.id,
      created_at: project.created_at,
    });
  }

  for (const request of input.requests) {
    rows.push({
      id: `change-${request.id}`,
      organization_id: input.organizationId,
      source: "support",
      event_type: "REQUEST_UPDATED",
      title: request.title,
      detail: labelFor(requestStatuses, request.status),
      actor_email: null,
      related_id: request.id,
      created_at: request.created_at,
    });
  }

  for (const invoice of input.invoices) {
    rows.push({
      id: `invoice-${invoice.id}`,
      organization_id: input.organizationId,
      source: "invoice",
      event_type: "INVOICE_UPDATED",
      title: invoice.title,
      detail: labelFor(invoiceStatuses, invoice.status),
      actor_email: null,
      related_id: invoice.id,
      created_at: invoice.created_at,
    });
  }

  for (const ticket of input.support) {
    rows.push({
      id: `support-${ticket.id}`,
      organization_id: input.organizationId,
      source: "support",
      event_type: "SUPPORT_UPDATED",
      title: ticket.title,
      detail: labelFor(supportStatuses, ticket.status),
      actor_email: null,
      related_id: ticket.id,
      created_at: ticket.created_at,
    });
  }

  for (const note of input.notes) {
    rows.push({
      id: `note-${note.id}`,
      organization_id: input.organizationId,
      source: "note",
      event_type: "NOTE_ADDED",
      title: "Notitie toegevoegd",
      detail: note.body,
      actor_email: null,
      related_id: note.id,
      created_at: note.created_at,
    });
  }

  return mergeActivity(rows);
}

export function brandAssets(assets: Array<{ kind: string; name: string; url: string | null; note: string | null }>) {
  return assets.filter((item) => item.kind === "logo" || item.kind === "huisstijl");
}
