import { seedBillingForProjects } from "@/lib/billing";
import { COMMERCIAL_EVENTS } from "@/lib/commercial";
import type { ActivitySource } from "@/lib/customers";
import { billingDraftsForProjects } from "@/lib/invoices";
import { refreshClient } from "@/lib/refresh";
import {
  isAssetKind,
  isLeadStatus,
  isOrganizationStatus,
  isProjectStatus,
  isRequestClassification,
  isRequestStatus,
  normalizeEmail,
  type AssetKind,
  type OrganizationStatus,
  type ProjectStatus,
  type ProjectType,
  type RequestClassification,
  type RequestType,
} from "@/lib/product";
import { isDeliveryProject, seedProductionFields } from "@/lib/production";
import { addOnboardingToStore, ensureOnboardingsForProjects } from "@/lib/onboarding-store";
import { isRecurringServiceType } from "@/lib/products";
import { products } from "@/lib/site";
import {
  OPEN_REQUEST_STATUSES,
  beheerSummary,
  buildBeheerCatalog,
  buildSupportInbox,
  buildWebsiteCatalog,
  defaultBeheerAmount,
  domainFromWebsite,
  isOpenRequest,
  isWebsiteProject,
  openSupportActions,
  productionUrlFromWebsite,
  resolveRequestType,
  todayDate,
} from "@/lib/sites";
import { mutateStore, newId, nowIso, readLocalLeads, readLocalMail, readStore, type MemberRow } from "@/lib/workspace-store";

export type OrganizationRow = {
  id: string;
  name: string;
  website: string | null;
  status: OrganizationStatus;
  inbound_lead_id: string | null;
  prospect_id: string | null;
  notes: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  organization_id: string;
  type: ProjectType;
  title: string;
  status: ProjectStatus;
  price_label: string | null;
  started_at: string | null;
  due_at: string | null;
  live_at: string | null;
  summary: string | null;
  created_at: string;
  primary_domain: string | null;
  preview_url: string | null;
  production_url: string | null;
  monthly_amount: number | null;
  included_note: string | null;
  last_checked_at: string | null;
  technical_note: string | null;
};

export type AssetRow = {
  id: string;
  organization_id: string;
  name: string;
  kind: AssetKind;
  url: string | null;
  note: string | null;
  created_at: string;
};

export type RequestRow = {
  id: string;
  organization_id: string;
  created_by_email: string | null;
  type: RequestType;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  file_url: string | null;
  file_name: string | null;
  classification: RequestClassification | null;
};

export type LeadRow = {
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
  prospect_id?: string | null;
};

export type MailRow = {
  id: string;
  lead_id: string | null;
  kind: string;
  to_email: string;
  subject: string | null;
  status: string;
  last_error: string | null;
  created_at: string;
};

export type ProspectRow = {
  id: string;
  company_name: string | null;
  domain: string;
  website_url: string;
  status: string;
  opportunity_score: number | null;
  source_type: string;
  created_at: string;
};

export function parseRequestInput(input: {
  type?: string;
  title?: string;
  body?: string;
  websiteIsLive?: boolean;
  source?: "support" | "wijziging";
}) {
  const type = resolveRequestType(input);
  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (title.length < 3) return { ok: false as const, message: "Geef een korte titel." };
  if (body.length < 8) return { ok: false as const, message: "Beschrijf wat je nodig hebt." };
  return { ok: true as const, type, title, body };
}

export function normalizeProject(project: ProjectRow): ProjectRow {
  return {
    ...project,
    primary_domain: project.primary_domain ?? null,
    preview_url: project.preview_url ?? null,
    production_url: project.production_url ?? null,
    monthly_amount: project.monthly_amount == null ? null : Number(project.monthly_amount),
    included_note: project.included_note ?? null,
    last_checked_at: project.last_checked_at ?? null,
    technical_note: project.technical_note ?? null,
  };
}

export function normalizeRequest(request: RequestRow): RequestRow {
  return {
    ...request,
    project_id: request.project_id ?? null,
    file_url: request.file_url ?? null,
    file_name: request.file_name ?? null,
    classification: request.classification ?? null,
  };
}

export function emptyProjectFields() {
  return {
    primary_domain: null as string | null,
    preview_url: null as string | null,
    production_url: null as string | null,
    monthly_amount: null as number | null,
    included_note: null as string | null,
    last_checked_at: null as string | null,
    technical_note: null as string | null,
  };
}

export function mapLeadToOrganization(lead: Pick<LeadRow, "company_name" | "name" | "website" | "id">) {
  return {
    name: lead.company_name?.trim() || lead.name,
    website: lead.website?.trim() || null,
    status: "onboarding" as const,
    inbound_lead_id: lead.id,
    notes: null,
  };
}

export function defaultProjectsForLead(type: string, website?: string | null) {
  const domain = domainFromWebsite(website);
  const productionUrl = productionUrlFromWebsite(website);
  const websiteProject = {
    type: "website" as const,
    title: products.website.name,
    status: "voorbereiding" as const,
    price_label: `${products.website.price} ${products.website.cadence}`,
    summary: products.website.summary,
    ...emptyProjectFields(),
    primary_domain: domain,
    production_url: productionUrl,
  };
  const beheer = {
    type: "beheer" as const,
    title: products.beheer.name,
    status: "voorbereiding" as const,
    price_label: `${products.beheer.price} ${products.beheer.cadence}`,
    summary: products.beheer.summary,
    ...emptyProjectFields(),
    monthly_amount: defaultBeheerAmount(),
    included_note: products.beheer.summary,
  };
  if (type === "maatwerk") {
    return [
      {
        type: "maatwerk" as const,
        title: "Maatwerk",
        status: "voorbereiding" as const,
        price_label: "Offerte",
        summary: "Scope en prijs volgen na het gesprek.",
        ...emptyProjectFields(),
        primary_domain: domain,
        production_url: productionUrl,
      },
    ];
  }
  return [websiteProject, beheer];
}

export async function loadOrganization(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_organizations").select("*").eq("id", id).maybeSingle();
    return (data as OrganizationRow | null) ?? null;
  }
  return (await readStore()).organizations.find((item) => item.id === id) ?? null;
}

export async function loadCustomerWorkspace(organizationId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const [organization, members, projects, assets, requests] = await Promise.all([
      loadOrganization(organizationId),
      supabase.from("kopvast_members").select("*").eq("organization_id", organizationId).order("created_at"),
      supabase.from("kopvast_projects").select("*").eq("organization_id", organizationId).order("created_at"),
      supabase.from("kopvast_assets").select("*").eq("organization_id", organizationId).order("created_at"),
      supabase
        .from("kopvast_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
    ]);
    if (!organization) return null;
    return {
      organization,
      members: ((members.data ?? []) as MemberRow[]).map(normalizeMember),
      projects: ((projects.data ?? []) as ProjectRow[]).map(normalizeProject),
      assets: (assets.data ?? []) as AssetRow[],
      requests: ((requests.data ?? []) as RequestRow[]).map(normalizeRequest),
    };
  }
  const store = await readStore();
  const organization = store.organizations.find((item) => item.id === organizationId);
  if (!organization) return null;
  return {
    organization,
    members: store.members
      .filter((item) => item.organization_id === organizationId)
      .map(normalizeMember),
    projects: store.projects
      .filter((item) => item.organization_id === organizationId)
      .map(normalizeProject),
    assets: store.assets.filter((item) => item.organization_id === organizationId),
    requests: store.requests
      .filter((item) => item.organization_id === organizationId)
      .map(normalizeRequest)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function createCustomerRequest(input: {
  organizationId: string;
  email: string;
  type?: string;
  title?: string;
  body?: string;
  projectId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  websiteIsLive?: boolean;
  source?: "support" | "wijziging";
}) {
  const parsed = parseRequestInput(input);
  if (!parsed.ok) return parsed;
  const row = {
    organization_id: input.organizationId,
    created_by_email: normalizeEmail(input.email),
    type: parsed.type,
    title: parsed.title,
    body: parsed.body,
    status: "nieuw",
    project_id: input.projectId?.trim() || null,
    file_name: input.fileName?.trim() || null,
    file_url: input.fileUrl?.trim() || null,
    classification: null as RequestClassification | null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_requests").insert(row);
    if (error) {
      console.error("[kopvast] Verzoek opslaan mislukt", error.message);
      return { ok: false as const, message: "Verzoek opslaan is tijdelijk niet beschikbaar." };
    }
    await appendOrgActivity({
      organizationId: input.organizationId,
      source: "support",
      eventType: COMMERCIAL_EVENTS.SUPPORT_CREATED,
      title: parsed.title,
      detail: parsed.body,
      actorEmail: input.email,
    });
    return { ok: true as const };
  }
  await mutateStore((store) => {
    store.requests.unshift({
      ...row,
      id: newId(),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  });
  await appendOrgActivity({
    organizationId: input.organizationId,
    source: "support",
    eventType: COMMERCIAL_EVENTS.SUPPORT_CREATED,
    title: parsed.title,
    detail: parsed.body,
    actorEmail: input.email,
  });
  return { ok: true as const };
}

export async function appendOrgActivity(input: {
  organizationId: string;
  source: ActivitySource;
  eventType: string;
  title: string;
  detail?: string | null;
  actorEmail?: string | null;
  relatedId?: string | null;
}) {
  const row = {
    organization_id: input.organizationId,
    source: input.source,
    event_type: input.eventType,
    title: input.title,
    detail: input.detail ?? null,
    actor_email: input.actorEmail ?? null,
    related_id: input.relatedId ?? null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_activity").insert(row);
    if (error) console.error("[kopvast] Activiteit opslaan mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.activity.unshift({ ...row, id: newId(), created_at: nowIso() });
  });
}

export async function loadAdminOverview() {
  const leads = await loadLeads();
  const organizations = await loadOrganizations();
  const mail = await loadMail();
  const supabase = refreshClient();
  let prospects: ProspectRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("prospects")
      .select("id, company_name, domain, website_url, status, opportunity_score, source_type, created_at")
      .eq("source_type", "kopvast")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(8);
    prospects = (data ?? []) as ProspectRow[];
  }
  let openRequests = 0;
  if (supabase) {
    const { count } = await supabase
      .from("kopvast_requests")
      .select("id", { count: "exact", head: true })
      .in("status", [...OPEN_REQUEST_STATUSES]);
    openRequests = count ?? 0;
  } else {
    openRequests = (await readStore()).requests.filter((item) => isOpenRequest(item.status)).length;
  }
  return {
    leadCount: leads.length,
    customerCount: organizations.filter((item) => item.status === "onboarding" || item.status === "active").length,
    openRequests,
    leads: leads.slice(0, 8),
    organizations: organizations.slice(0, 8),
    mail: mail.slice(0, 8),
    prospects,
  };
}

export async function loadLeads() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("inbound_leads").select("*").order("created_at", { ascending: false });
    return (data ?? []) as LeadRow[];
  }
  return readLocalLeads();
}

export async function loadLead(id: string) {
  const leads = await loadLeads();
  return leads.find((item) => item.id === id) ?? null;
}

export async function loadOrganizations() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_organizations").select("*").order("created_at", { ascending: false });
    return (data ?? []) as OrganizationRow[];
  }
  return (await readStore()).organizations;
}

export async function loadProjects() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_projects").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as ProjectRow[]).map(normalizeProject);
  }
  return (await readStore()).projects.map(normalizeProject);
}

export async function loadRequests() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_requests").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as RequestRow[]).map(normalizeRequest);
  }
  return (await readStore()).requests.map(normalizeRequest);
}

export async function loadWorkspaceCatalog() {
  const [organizations, projects, requests] = await Promise.all([
    loadOrganizations(),
    loadProjects(),
    loadRequests(),
  ]);
  return { organizations, projects, requests };
}

export async function loadWebsiteCatalog() {
  const { organizations, projects, requests } = await loadWorkspaceCatalog();
  return buildWebsiteCatalog(organizations, projects, requests);
}

export async function loadBeheerOverview() {
  const { organizations, projects, requests } = await loadWorkspaceCatalog();
  const records = buildBeheerCatalog(organizations, projects, requests);
  return { records, summary: beheerSummary(records) };
}

export async function loadSupportInbox() {
  const { organizations, projects, requests } = await loadWorkspaceCatalog();
  return buildSupportInbox(organizations, projects, requests);
}

export async function loadOpenSupportActions() {
  return openSupportActions(await loadSupportInbox());
}

export async function loadWebsiteDetail(id: string) {
  const { organizations, projects, requests } = await loadWorkspaceCatalog();
  const project = projects.find((item) => item.id === id);
  if (!project || !isWebsiteProject(project)) return null;
  const websites = buildWebsiteCatalog(organizations, projects, requests);
  const website = websites.find((item) => item.id === id);
  if (!website) return null;
  return {
    website,
    project,
    organization: organizations.find((item) => item.id === project.organization_id) ?? null,
    beheer:
      projects.find((item) => item.organization_id === project.organization_id && item.type === "beheer") ?? null,
    recurring: projects.filter(
      (item) => item.organization_id === project.organization_id && isRecurringServiceType(item.type)
    ),
    requests: requests.filter((item) => item.organization_id === project.organization_id),
  };
}

export async function loadMail() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("email_messages").select("*").order("created_at", { ascending: false }).limit(80);
    return (data ?? []) as MailRow[];
  }
  return readLocalMail();
}

export async function updateLeadStatus(id: string, status: string) {
  if (!isLeadStatus(status)) return { ok: false as const, message: "Onbekende status." };
  const supabase = refreshClient();
  if (!supabase) return { ok: true as const };
  const { error } = await supabase.from("inbound_leads").update({ status }).eq("id", id);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function convertLead(leadId: string) {
  const lead = await loadLead(leadId);
  if (!lead) return { ok: false as const, message: "Aanvraag niet gevonden." };
  const supabase = refreshClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from("kopvast_organizations")
      .select("id")
      .eq("inbound_lead_id", lead.id)
      .maybeSingle();
    if (existing) return { ok: true as const, organizationId: existing.id as string, already: true };

    const org = mapLeadToOrganization(lead);
    const { data: created, error } = await supabase.from("kopvast_organizations").insert(org).select("id").single();
    if (error || !created) {
      console.error("[kopvast] Klant aanmaken mislukt", error?.message);
      return { ok: false as const, message: "Klant aanmaken mislukt." };
    }
    await supabase.from("kopvast_members").insert({
      organization_id: created.id,
      name: lead.name,
      email: normalizeEmail(lead.email),
      role: "owner",
      access_enabled: true,
    });
    const projects = defaultProjectsForLead(lead.type, lead.website).map((project) => ({
      ...project,
      organization_id: created.id,
    }));
    if (projects.length) {
      const { data: createdProjects } = await supabase
        .from("kopvast_projects")
        .insert(projects)
        .select("*");
      if (createdProjects?.length) {
        const rows = createdProjects as Array<{ id: string; organization_id: string; type: string; title: string }>;
        await seedBillingForProjects(rows);
        await ensureOnboardingsForProjects(createdProjects);
        const productions = (createdProjects as ProjectRow[])
          .filter((project) => isDeliveryProject(project.type))
          .map((project) => seedProductionFields(project));
        if (productions.length) await supabase.from("kopvast_productions").insert(productions);
      }
    }
    await supabase.from("inbound_leads").update({ status: "OMGEZET" }).eq("id", lead.id);
    return { ok: true as const, organizationId: created.id as string };
  }

  return mutateStore((store) => {
    const existing = store.organizations.find((item) => item.inbound_lead_id === lead.id);
    if (existing) return { ok: true as const, organizationId: existing.id, already: true };
    const created = {
      ...mapLeadToOrganization(lead),
      id: newId(),
      created_at: nowIso(),
      updated_at: nowIso(),
      prospect_id: null,
    };
    store.organizations.unshift(created);
    store.members.push({
      id: newId(),
      organization_id: created.id,
      name: lead.name,
      email: normalizeEmail(lead.email),
      role: "owner",
      access_enabled: true,
    });
    const createdProjects = defaultProjectsForLead(lead.type, lead.website).map((project) => ({
      ...project,
      id: newId(),
      organization_id: created.id,
      started_at: null,
      due_at: null,
      live_at: null,
      created_at: nowIso(),
    }));
    store.projects.push(...createdProjects);
    for (const row of createdProjects) {
      addOnboardingToStore(store, row);
      if (isDeliveryProject(row.type)) {
        store.productions.unshift({
          ...seedProductionFields(row),
          id: newId(),
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    }
    const drafts = billingDraftsForProjects(createdProjects);
    const createdAt = nowIso();
    for (const invoice of drafts.invoices) {
      store.billingInvoices.unshift({ ...invoice, id: newId(), created_at: createdAt, updated_at: createdAt });
    }
    for (const item of drafts.recurring) {
      store.recurring.unshift({ ...item, id: newId(), created_at: createdAt, updated_at: createdAt });
    }
    return { ok: true as const, organizationId: created.id };
  });
}

export async function updateOrganization(id: string, input: { status?: string; notes?: string }) {
  if (input.status && !isOrganizationStatus(input.status)) return { ok: false as const, message: "Onbekende status." };
  const supabase = refreshClient();
  const patch: Record<string, string> = { updated_at: nowIso() };
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (supabase) {
    const { error } = await supabase.from("kopvast_organizations").update(patch).eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const org = store.organizations.find((item) => item.id === id);
    if (!org) return;
    if (input.status && isOrganizationStatus(input.status)) org.status = input.status;
    if (input.notes !== undefined) org.notes = input.notes;
  });
  return { ok: true as const };
}

export type ProjectPatch = {
  status?: string;
  primary_domain?: string | null;
  preview_url?: string | null;
  production_url?: string | null;
  technical_note?: string | null;
  monthly_amount?: number | null;
  included_note?: string | null;
  last_checked_at?: string | null;
  started_at?: string | null;
  live_at?: string | null;
};

export async function updateProject(id: string, input: ProjectPatch) {
  if (input.status && !isProjectStatus(input.status)) return { ok: false as const, message: "Onbekende status." };
  const current = (await loadProjects()).find((item) => item.id === id);
  if (!current) return { ok: false as const, message: "Project niet gevonden." };
  const patch: Record<string, string | number | null> = {};
  if (input.status) patch.status = input.status;
  if (input.primary_domain !== undefined) patch.primary_domain = emptyToNull(input.primary_domain);
  if (input.preview_url !== undefined) patch.preview_url = emptyToNull(input.preview_url);
  if (input.production_url !== undefined) patch.production_url = emptyToNull(input.production_url);
  if (input.technical_note !== undefined) patch.technical_note = emptyToNull(input.technical_note);
  if (input.monthly_amount !== undefined) patch.monthly_amount = input.monthly_amount;
  if (input.included_note !== undefined) patch.included_note = emptyToNull(input.included_note);
  if (input.last_checked_at !== undefined) patch.last_checked_at = input.last_checked_at;
  if (input.started_at !== undefined) patch.started_at = emptyToNull(input.started_at);
  if (input.live_at !== undefined) patch.live_at = emptyToNull(input.live_at);
  const nextStatus = String(patch.status ?? current.status);
  const nextLiveAt = "live_at" in patch ? patch.live_at : current.live_at;
  const nextStartedAt = "started_at" in patch ? patch.started_at : current.started_at;
  if (nextStatus === "live" && !nextLiveAt) patch.live_at = todayDate();
  if (current.type === "beheer" && nextStatus === "live" && !nextStartedAt) patch.started_at = todayDate();
  if (Object.keys(patch).length === 0) return { ok: true as const };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_projects").update(patch).eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const project = store.projects.find((item) => item.id === id);
    if (!project) return;
    if (isProjectStatus(String(patch.status ?? ""))) project.status = patch.status as ProjectStatus;
    if ("primary_domain" in patch) project.primary_domain = patch.primary_domain as string | null;
    if ("preview_url" in patch) project.preview_url = patch.preview_url as string | null;
    if ("production_url" in patch) project.production_url = patch.production_url as string | null;
    if ("technical_note" in patch) project.technical_note = patch.technical_note as string | null;
    if ("monthly_amount" in patch) project.monthly_amount = patch.monthly_amount as number | null;
    if ("included_note" in patch) project.included_note = patch.included_note as string | null;
    if ("last_checked_at" in patch) project.last_checked_at = patch.last_checked_at as string | null;
    if ("started_at" in patch) project.started_at = patch.started_at as string | null;
    if ("live_at" in patch) project.live_at = patch.live_at as string | null;
  });
  return { ok: true as const };
}

export async function updateProjectStatus(id: string, status: string) {
  return updateProject(id, { status });
}

export async function updateRequest(id: string, input: { status?: string; classification?: string | null }) {
  if (input.status && !isRequestStatus(input.status)) return { ok: false as const, message: "Onbekende status." };
  if (input.classification && !isRequestClassification(input.classification)) {
    return { ok: false as const, message: "Onbekende indeling." };
  }
  const patch: Record<string, string | null> = { updated_at: nowIso() };
  if (input.status) patch.status = input.status;
  if (input.classification !== undefined) patch.classification = input.classification || null;
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_requests").update(patch).eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const request = store.requests.find((item) => item.id === id);
    if (!request) return;
    if (input.status) request.status = input.status;
    if (input.classification !== undefined) request.classification = (input.classification || null) as RequestClassification | null;
    request.updated_at = nowIso();
  });
  return { ok: true as const };
}

export async function updateRequestStatus(id: string, status: string) {
  return updateRequest(id, { status });
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function addAsset(input: {
  organizationId: string;
  name: string;
  kind: string;
  url?: string;
  note?: string;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, message: "Geef een bestandsnaam." };
  if (!isAssetKind(input.kind)) return { ok: false as const, message: "Onbekend type." };
  const row = {
    organization_id: input.organizationId,
    name,
    kind: input.kind,
    url: input.url?.trim() || null,
    note: input.note?.trim() || null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_assets").insert(row);
    if (error) return { ok: false as const, message: error.message };
    await appendOrgActivity({
      organizationId: input.organizationId,
      source: "onboarding",
      eventType: COMMERCIAL_EVENTS.ASSET_RECEIVED,
      title: name,
      detail: input.note?.trim() || input.kind,
    });
    return { ok: true as const };
  }
  await mutateStore((store) => {
    store.assets.push({ ...row, id: newId(), created_at: nowIso() });
  });
  await appendOrgActivity({
    organizationId: input.organizationId,
    source: "onboarding",
    eventType: COMMERCIAL_EVENTS.ASSET_RECEIVED,
    title: name,
    detail: input.note?.trim() || input.kind,
  });
  return { ok: true as const };
}

export function normalizeMember(member: MemberRow): MemberRow {
  return { ...member, access_enabled: member.access_enabled !== false };
}

export async function loadMembers() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_members").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as MemberRow[]).map(normalizeMember);
  }
  return (await readStore()).members.map(normalizeMember);
}

export async function setMemberAccess(id: string, accessEnabled: boolean) {
  if (!id) return { ok: false as const, message: "Gebruiker ontbreekt." };
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_members")
      .update({ access_enabled: accessEnabled })
      .eq("id", id)
      .select("email")
      .maybeSingle();
    if (error || !data) return { ok: false as const, message: error?.message ?? "Gebruiker niet gevonden." };
    return { ok: true as const, email: normalizeEmail(data.email) };
  }
  return mutateStore((store) => {
    const member = store.members.find((item) => item.id === id);
    if (!member) return { ok: false as const, message: "Gebruiker niet gevonden." };
    member.access_enabled = accessEnabled;
    return { ok: true as const, email: normalizeEmail(member.email) };
  });
}
