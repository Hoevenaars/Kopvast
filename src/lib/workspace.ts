import { refreshClient } from "@/lib/refresh";
import {
  isAssetKind,
  isLeadStatus,
  isOrganizationStatus,
  isProjectStatus,
  isRequestType,
  normalizeEmail,
  type AssetKind,
  type OrganizationStatus,
  type ProjectStatus,
  type ProjectType,
  type RequestType,
} from "@/lib/product";
import { isDeliveryProject, seedProductionFields } from "@/lib/production";
import { products } from "@/lib/site";
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

export function parseRequestInput(input: { type?: string; title?: string; body?: string }) {
  const rawType = input.type ?? "wijziging";
  const type = isRequestType(rawType) ? rawType : "wijziging";
  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (title.length < 3) return { ok: false as const, message: "Geef een korte titel." };
  if (body.length < 8) return { ok: false as const, message: "Beschrijf wat je nodig hebt." };
  return { ok: true as const, type, title, body };
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

export function defaultProjectsForLead(type: string) {
  const website = {
    type: "website" as const,
    title: products.website.name,
    status: "voorbereiding" as const,
    price_label: `${products.website.price} ${products.website.cadence}`,
    summary: products.website.summary,
  };
  const beheer = {
    type: "beheer" as const,
    title: products.beheer.name,
    status: "voorbereiding" as const,
    price_label: `${products.beheer.price} ${products.beheer.cadence}`,
    summary: products.beheer.summary,
  };
  if (type === "maatwerk") {
    return [
      {
        type: "maatwerk" as const,
        title: "Maatwerk",
        status: "voorbereiding" as const,
        price_label: "Offerte",
        summary: "Scope en prijs volgen na het gesprek.",
      },
    ];
  }
  return [website, beheer];
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
      projects: (projects.data ?? []) as ProjectRow[],
      assets: (assets.data ?? []) as AssetRow[],
      requests: (requests.data ?? []) as RequestRow[],
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
    projects: store.projects.filter((item) => item.organization_id === organizationId),
    assets: store.assets.filter((item) => item.organization_id === organizationId),
    requests: store.requests
      .filter((item) => item.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function createCustomerRequest(input: {
  organizationId: string;
  email: string;
  type?: string;
  title?: string;
  body?: string;
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
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_requests").insert(row);
    if (error) {
      console.error("[kopvast] Verzoek opslaan mislukt", error.message);
      return { ok: false as const, message: "Verzoek opslaan is tijdelijk niet beschikbaar." };
    }
    return { ok: true as const };
  }
  await mutateStore((store) => {
    store.requests.unshift({
      ...row,
      id: newId(),
      type: parsed.type,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  });
  return { ok: true as const };
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
      .in("status", ["nieuw", "in_behandeling", "wacht_op_klant"]);
    openRequests = count ?? 0;
  } else {
    openRequests = (await readStore()).requests.filter((item) =>
      ["nieuw", "in_behandeling", "wacht_op_klant"].includes(item.status)
    ).length;
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
    const projects = defaultProjectsForLead(lead.type).map((project) => ({
      ...project,
      organization_id: created.id,
    }));
    if (projects.length) {
      const { data: createdProjects } = await supabase.from("kopvast_projects").insert(projects).select("*");
      const productions = ((createdProjects ?? []) as ProjectRow[])
        .filter((project) => isDeliveryProject(project.type))
        .map((project) => seedProductionFields(project));
      if (productions.length) await supabase.from("kopvast_productions").insert(productions);
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
    for (const project of defaultProjectsForLead(lead.type)) {
      const createdProject = {
        ...project,
        id: newId(),
        organization_id: created.id,
        started_at: null,
        due_at: null,
        live_at: null,
        created_at: nowIso(),
      };
      store.projects.push(createdProject);
      if (isDeliveryProject(createdProject.type)) {
        store.productions.unshift({
          ...seedProductionFields(createdProject),
          id: newId(),
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
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

export async function updateProjectStatus(id: string, status: string) {
  if (!isProjectStatus(status)) return { ok: false as const, message: "Onbekende status." };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_projects").update({ status }).eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const project = store.projects.find((item) => item.id === id);
    if (project) project.status = status;
  });
  return { ok: true as const };
}

export async function updateRequestStatus(id: string, status: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_requests")
      .update({ status, updated_at: nowIso() })
      .eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const request = store.requests.find((item) => item.id === id);
    if (request) {
      request.status = status;
      request.updated_at = nowIso();
    }
  });
  return { ok: true as const };
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
    return { ok: true as const };
  }
  await mutateStore((store) => {
    store.assets.push({ ...row, id: newId(), created_at: nowIso() });
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
