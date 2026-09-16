import {
  activityFromRecords,
  customerMatchesFilter,
  customerSearchHaystack,
  isInvoiceStatus,
  isProposalStatus,
  isSupportStatus,
  listFactsForCustomer,
  mergeActivity,
  resolveCustomerMatch,
  type ActivityRow,
  type ActivitySource,
  type BrandProfileRow,
  type CustomerFilter,
  type CustomerListFacts,
  type CustomerMatchOrg,
  type CustomerReviewRow,
  type InvoiceRow,
  type NoteRow,
  type ProposalRow,
  type SupportRow,
} from "@/lib/customers";
import {
  isProjectType,
  normalizeEmail,
  type ProjectType,
} from "@/lib/product";
import { refreshClient } from "@/lib/refresh";
import {
  defaultProjectsForLead,
  loadCustomerWorkspace,
  loadLead,
  loadLeads,
  loadMembers,
  loadOrganizations,
  mapLeadToOrganization,
  updateLeadStatus,
  type LeadRow,
  type OrganizationRow,
  type ProjectRow,
  type RequestRow,
} from "@/lib/workspace";
import { mutateStore, newId, nowIso, readStore } from "@/lib/workspace-store";

export type CustomerListItem = CustomerListFacts & {
  organization: OrganizationRow;
};

export type OpenCustomerReview = CustomerReviewRow & {
  proposalTitle: string;
  candidateName: string;
  contactEmail: string | null;
  companyName: string | null;
};

export type CustomerDossier = NonNullable<Awaited<ReturnType<typeof loadCustomerWorkspace>>> & {
  leads: LeadRow[];
  proposals: ProposalRow[];
  invoices: InvoiceRow[];
  notes: NoteRow[];
  support: SupportRow[];
  brand: BrandProfileRow | null;
  activity: ActivityRow[];
  reviews: CustomerReviewRow[];
  facts: CustomerListFacts;
};

export type CustomerWriteResult =
  | { ok: true; organizationId: string; already?: boolean }
  | { ok: false; message: string }
  | {
      ok: false;
      needsReview: true;
      proposalId: string;
      candidates: Array<{ id: string; name: string; reason: string }>;
    };

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function asProposal(row: ProposalRow): ProposalRow {
  return {
    ...row,
    status: isProposalStatus(row.status) ? row.status : "concept",
    product_type: row.product_type || "website",
  };
}

async function loadMatchOrgs(): Promise<CustomerMatchOrg[]> {
  const [organizations, members] = await Promise.all([loadOrganizations(), loadMembers()]);
  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    website: org.website,
    inbound_lead_id: org.inbound_lead_id,
    prospect_id: org.prospect_id,
    memberEmails: members.filter((item) => item.organization_id === org.id).map((item) => normalizeEmail(item.email)),
  }));
}

async function loadProposal(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_proposals").select("*").eq("id", id).maybeSingle();
    return data ? asProposal(data as ProposalRow) : null;
  }
  const row = (await readStore()).proposals.find((item) => item.id === id);
  return row ? asProposal(row) : null;
}

async function saveProposalPatch(id: string, patch: Partial<ProposalRow>) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_proposals")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id);
    if (error) return fail(error.message);
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const row = store.proposals.find((item) => item.id === id);
    if (!row) return;
    Object.assign(row, patch, { updated_at: nowIso() });
  });
  return { ok: true as const };
}

async function insertProposal(input: Omit<ProposalRow, "id" | "created_at" | "updated_at">) {
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_proposals").insert(input).select("*").single();
    if (error || !data) return { ok: false as const, message: error?.message ?? "Voorstel opslaan mislukt." };
    return { ok: true as const, proposal: asProposal(data as ProposalRow) };
  }
  const proposal: ProposalRow = { ...input, id: newId(), created_at: nowIso(), updated_at: nowIso() };
  await mutateStore((store) => {
    store.proposals.unshift(proposal);
  });
  return { ok: true as const, proposal };
}

async function logActivity(input: {
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
    if (error) console.error("[kopvast] Klantactiviteit mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.activity.unshift({ ...row, id: newId(), created_at: nowIso() });
  });
}

async function insertReviews(proposalId: string, candidates: Array<{ id: string; reason: string }>) {
  const rows = candidates.map((item) => ({
    proposal_id: proposalId,
    candidate_organization_id: item.id,
    reason: item.reason,
    status: "open" as const,
  }));
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_customer_reviews").insert(rows);
    if (error) console.error("[kopvast] Klantreview opslaan mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    for (const row of rows) {
      store.customerReviews.push({ ...row, id: newId(), created_at: nowIso() });
    }
  });
}

async function addMemberIfMissing(input: { organizationId: string; name: string; email: string }) {
  const email = normalizeEmail(input.email);
  if (!email) return;
  const members = await loadMembers();
  if (members.some((item) => item.organization_id === input.organizationId && normalizeEmail(item.email) === email)) {
    return;
  }
  const row = {
    organization_id: input.organizationId,
    name: input.name.trim() || email,
    email,
    role: "owner",
    access_enabled: true,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_members").insert(row);
    if (error) console.error("[kopvast] Contact koppelen mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.members.push({ ...row, id: newId() });
  });
}

async function linkProposalToOrg(proposal: ProposalRow, organizationId: string, actorEmail?: string) {
  await saveProposalPatch(proposal.id, {
    organization_id: organizationId,
    status: "geaccepteerd",
    accepted_at: proposal.accepted_at || nowIso(),
  });
  const supabase = refreshClient();
  const patch: Record<string, string | null> = { updated_at: nowIso() };
  if (proposal.inbound_lead_id) patch.inbound_lead_id = proposal.inbound_lead_id;
  if (proposal.prospect_id) patch.prospect_id = proposal.prospect_id;
  if (supabase) {
    const { data: org } = await supabase
      .from("kopvast_organizations")
      .select("inbound_lead_id, prospect_id")
      .eq("id", organizationId)
      .maybeSingle();
    const next: Record<string, string> = { updated_at: nowIso() };
    if (!org?.inbound_lead_id && proposal.inbound_lead_id) next.inbound_lead_id = proposal.inbound_lead_id;
    if (!org?.prospect_id && proposal.prospect_id) next.prospect_id = proposal.prospect_id;
    await supabase.from("kopvast_organizations").update(next).eq("id", organizationId);
  } else {
    await mutateStore((store) => {
      const org = store.organizations.find((item) => item.id === organizationId);
      if (!org) return;
      if (!org.inbound_lead_id && proposal.inbound_lead_id) org.inbound_lead_id = proposal.inbound_lead_id;
      if (!org.prospect_id && proposal.prospect_id) org.prospect_id = proposal.prospect_id;
    });
  }
  if (proposal.contact_email) {
    await addMemberIfMissing({
      organizationId,
      name: proposal.contact_name || proposal.company_name || proposal.title,
      email: proposal.contact_email,
    });
  }
  await logActivity({
    organizationId,
    source: "proposal",
    eventType: "PROPOSAL_ACCEPTED",
    title: proposal.title,
    detail: "Voorstel gekoppeld aan bestaande klant",
    actorEmail,
    relatedId: proposal.id,
  });
}

async function createCustomerFromProposal(proposal: ProposalRow, actorEmail?: string) {
  const lead = proposal.inbound_lead_id ? await loadLead(proposal.inbound_lead_id) : null;
  const orgInput = lead
    ? { ...mapLeadToOrganization(lead), prospect_id: proposal.prospect_id ?? null }
    : {
        name: proposal.company_name?.trim() || proposal.contact_name?.trim() || proposal.title,
        website: proposal.website?.trim() || null,
        status: "onboarding" as const,
        inbound_lead_id: proposal.inbound_lead_id,
        prospect_id: proposal.prospect_id ?? null,
        notes: null,
      };
  const projectType = isProjectType(proposal.product_type) ? proposal.product_type : lead?.type === "maatwerk" ? "maatwerk" : "website";
  const projects = defaultProjectsForLead(lead?.type === "maatwerk" ? "maatwerk" : projectType);
  const memberName = proposal.contact_name || lead?.name || orgInput.name;
  const memberEmail = proposal.contact_email || lead?.email || null;

  const supabase = refreshClient();
  if (supabase) {
    const { data: created, error } = await supabase.from("kopvast_organizations").insert(orgInput).select("id").single();
    if (error || !created) {
      console.error("[kopvast] Klant aanmaken mislukt", error?.message);
      return fail("Klant aanmaken mislukt.");
    }
    if (memberEmail) {
      await supabase.from("kopvast_members").insert({
        organization_id: created.id,
        name: memberName,
        email: normalizeEmail(memberEmail),
        role: "owner",
        access_enabled: true,
      });
    }
    if (projects.length) {
      await supabase.from("kopvast_projects").insert(projects.map((project) => ({ ...project, organization_id: created.id })));
    }
    await saveProposalPatch(proposal.id, {
      organization_id: created.id,
      status: "geaccepteerd",
      accepted_at: nowIso(),
    });
    await logActivity({
      organizationId: created.id,
      source: "onboarding",
      eventType: "CUSTOMER_CREATED",
      title: `${orgInput.name} is klant`,
      detail: "Aangemaakt vanuit geaccepteerd voorstel",
      actorEmail,
      relatedId: proposal.id,
    });
    return { ok: true as const, organizationId: created.id as string };
  }

  const created = await mutateStore((store) => {
    const row: OrganizationRow = {
      ...orgInput,
      id: newId(),
      created_at: nowIso(),
      prospect_id: orgInput.prospect_id ?? null,
    };
    store.organizations.unshift(row);
    if (memberEmail) {
      store.members.push({
        id: newId(),
        organization_id: row.id,
        name: memberName,
        email: normalizeEmail(memberEmail),
        role: "owner",
        access_enabled: true,
      });
    }
    for (const project of projects) {
      store.projects.push({
        ...project,
        id: newId(),
        organization_id: row.id,
        started_at: null,
        due_at: null,
        live_at: null,
        created_at: nowIso(),
      });
    }
    return row;
  });
  await saveProposalPatch(proposal.id, {
    organization_id: created.id,
    status: "geaccepteerd",
    accepted_at: nowIso(),
  });
  await logActivity({
    organizationId: created.id,
    source: "onboarding",
    eventType: "CUSTOMER_CREATED",
    title: `${created.name} is klant`,
    detail: "Aangemaakt vanuit geaccepteerd voorstel",
    actorEmail,
    relatedId: proposal.id,
  });
  return { ok: true as const, organizationId: created.id };
}

export async function getOrCreateCustomerFromAcceptedProposal(
  proposalId: string,
  actorEmail?: string
): Promise<CustomerWriteResult> {
  const proposal = await loadProposal(proposalId);
  if (!proposal) return fail("Voorstel niet gevonden.");
  if (proposal.status !== "geaccepteerd" && proposal.status !== "review") {
    return fail("Alleen een geaccepteerd voorstel mag een klant maken.");
  }

  const orgs = await loadMatchOrgs();
  const match = resolveCustomerMatch(
    {
      organizationId: proposal.organization_id,
      inboundLeadId: proposal.inbound_lead_id,
      prospectId: proposal.prospect_id,
      email: proposal.contact_email,
      website: proposal.website,
      companyName: proposal.company_name,
    },
    orgs
  );

  if (match.kind === "linked" || match.kind === "unique") {
    const already = match.kind === "linked";
    await linkProposalToOrg(proposal, match.organizationId, actorEmail);
    return { ok: true, organizationId: match.organizationId, already };
  }

  if (match.kind === "review") {
    await saveProposalPatch(proposal.id, { status: "review" });
    await insertReviews(
      proposal.id,
      match.candidates.map((item) => ({ id: item.id, reason: item.reason }))
    );
    return { ok: false, needsReview: true, proposalId: proposal.id, candidates: match.candidates };
  }

  return createCustomerFromProposal(proposal, actorEmail);
}

async function proposalForLead(lead: LeadRow, organizationId: string | null) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_proposals").select("*").eq("inbound_lead_id", lead.id).maybeSingle();
    if (data) return asProposal(data as ProposalRow);
  } else {
    const existing = (await readStore()).proposals.find((item) => item.inbound_lead_id === lead.id);
    if (existing) return asProposal(existing);
  }
  const created = await insertProposal({
    organization_id: organizationId,
    inbound_lead_id: lead.id,
    prospect_id: null,
    title: `Voorstel ${lead.company_name || lead.name}`,
    body: lead.notes,
    status: "geaccepteerd",
    product_type: lead.type === "maatwerk" ? "maatwerk" : "website",
    amount_label: null,
    contact_name: lead.name,
    contact_email: normalizeEmail(lead.email),
    company_name: lead.company_name,
    website: lead.website,
    accepted_at: nowIso(),
  });
  if (!created.ok) return null;
  return created.proposal;
}

export async function convertLead(leadId: string, actorEmail?: string): Promise<CustomerWriteResult> {
  const lead = await loadLead(leadId);
  if (!lead) return fail("Aanvraag niet gevonden.");
  const organizations = await loadOrganizations();
  const existing = organizations.find((item) => item.inbound_lead_id === lead.id) ?? null;
  if (existing) {
    await proposalForLead(lead, existing.id);
    return { ok: true, organizationId: existing.id, already: true };
  }
  const proposal = await proposalForLead(lead, null);
  if (!proposal) return fail("Voorstel aanmaken mislukt.");
  if (proposal.status !== "geaccepteerd" && proposal.status !== "review") {
    await saveProposalPatch(proposal.id, { status: "geaccepteerd", accepted_at: nowIso() });
  }
  const result = await getOrCreateCustomerFromAcceptedProposal(proposal.id, actorEmail);
  if (result.ok) await updateLeadStatus(lead.id, "OMGEZET");
  return result;
}

export async function resolveCustomerReview(input: {
  proposalId: string;
  action: "merge" | "create";
  organizationId?: string;
  actorEmail?: string;
}): Promise<CustomerWriteResult> {
  const proposal = await loadProposal(input.proposalId);
  if (!proposal) return fail("Voorstel niet gevonden.");
  await saveProposalPatch(proposal.id, { status: "geaccepteerd", accepted_at: proposal.accepted_at || nowIso() });

  const supabase = refreshClient();
  const close = async (status: "merged" | "kept_separate") => {
    if (supabase) {
      await supabase
        .from("kopvast_customer_reviews")
        .update({ status })
        .eq("proposal_id", proposal.id)
        .eq("status", "open");
      return;
    }
    await mutateStore((store) => {
      for (const row of store.customerReviews) {
        if (row.proposal_id === proposal.id && row.status === "open") row.status = status;
      }
    });
  };

  if (input.action === "merge") {
    if (!input.organizationId) return fail("Kies een bestaande klant.");
    await close("merged");
    await linkProposalToOrg({ ...proposal, status: "geaccepteerd" }, input.organizationId, input.actorEmail);
    if (proposal.inbound_lead_id) await updateLeadStatus(proposal.inbound_lead_id, "OMGEZET");
    return { ok: true, organizationId: input.organizationId };
  }

  await close("kept_separate");
  const created = await createCustomerFromProposal({ ...proposal, organization_id: null, status: "geaccepteerd" }, input.actorEmail);
  if (created.ok && proposal.inbound_lead_id) await updateLeadStatus(proposal.inbound_lead_id, "OMGEZET");
  return created;
}

export async function createProposalForCustomer(input: {
  organizationId: string;
  title: string;
  body?: string;
  productType?: string;
  amountLabel?: string;
  actorEmail?: string;
}) {
  const title = input.title.trim();
  if (title.length < 3) return fail("Geef een titel voor het voorstel.");
  const workspace = await loadCustomerWorkspace(input.organizationId);
  if (!workspace) return fail("Klant niet gevonden.");
  const owner = workspace.members[0] ?? null;
  const created = await insertProposal({
    organization_id: input.organizationId,
    inbound_lead_id: workspace.organization.inbound_lead_id,
    prospect_id: workspace.organization.prospect_id,
    title,
    body: input.body?.trim() || null,
    status: "concept",
    product_type: isProjectType(input.productType ?? "") ? input.productType! : "website",
    amount_label: input.amountLabel?.trim() || null,
    contact_name: owner?.name ?? null,
    contact_email: owner?.email ?? null,
    company_name: workspace.organization.name,
    website: workspace.organization.website,
    accepted_at: null,
  });
  if (!created.ok) return created;
  await logActivity({
    organizationId: input.organizationId,
    source: "proposal",
    eventType: "PROPOSAL_CREATED",
    title,
    actorEmail: input.actorEmail,
    relatedId: created.proposal.id,
  });
  return { ok: true as const, proposalId: created.proposal.id };
}

export async function acceptProposal(proposalId: string, actorEmail?: string) {
  const proposal = await loadProposal(proposalId);
  if (!proposal) return fail("Voorstel niet gevonden.");
  await saveProposalPatch(proposalId, { status: "geaccepteerd", accepted_at: nowIso() });
  return getOrCreateCustomerFromAcceptedProposal(proposalId, actorEmail);
}

export async function addCustomerNote(input: { organizationId: string; body: string; actorEmail?: string }) {
  const body = input.body.trim();
  if (body.length < 3) return fail("Schrijf een korte notitie.");
  const row = { organization_id: input.organizationId, body, created_by: input.actorEmail ?? null };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_notes").insert(row);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.notes.unshift({ ...row, id: newId(), created_at: nowIso() });
    });
  }
  await logActivity({
    organizationId: input.organizationId,
    source: "note",
    eventType: "NOTE_ADDED",
    title: "Notitie toegevoegd",
    detail: body,
    actorEmail: input.actorEmail,
  });
  return { ok: true as const };
}

export async function addCustomerSupport(input: { organizationId: string; title: string; body: string; actorEmail?: string }) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 3) return fail("Geef een titel.");
  if (body.length < 3) return fail("Beschrijf de melding.");
  const row = { organization_id: input.organizationId, title, body, status: "open" as const };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_support").insert(row);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.support.unshift({ ...row, id: newId(), created_at: nowIso(), updated_at: nowIso() });
    });
  }
  await logActivity({
    organizationId: input.organizationId,
    source: "support",
    eventType: "SUPPORT_CREATED",
    title,
    detail: body,
    actorEmail: input.actorEmail,
  });
  return { ok: true as const };
}

export async function addCustomerProject(input: {
  organizationId: string;
  title: string;
  type: string;
  priceLabel?: string;
  actorEmail?: string;
}) {
  const title = input.title.trim();
  if (title.length < 3) return fail("Geef een opdrachtnaam.");
  if (!isProjectType(input.type)) return fail("Onbekend type opdracht.");
  const row = {
    organization_id: input.organizationId,
    type: input.type as ProjectType,
    title,
    status: "voorbereiding" as const,
    price_label: input.priceLabel?.trim() || null,
    summary: null as string | null,
    started_at: null as string | null,
    due_at: null as string | null,
    live_at: null as string | null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_projects").insert(row);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.projects.push({ ...row, id: newId(), created_at: nowIso() });
    });
  }
  await logActivity({
    organizationId: input.organizationId,
    source: "order",
    eventType: "ORDER_CREATED",
    title,
    detail: input.type,
    actorEmail: input.actorEmail,
  });
  return { ok: true as const };
}

export async function addCustomerInvoice(input: {
  organizationId: string;
  title: string;
  amountLabel?: string;
  number?: string;
  actorEmail?: string;
}) {
  const title = input.title.trim();
  if (title.length < 3) return fail("Geef een factuurtitel.");
  const row = {
    organization_id: input.organizationId,
    project_id: null as string | null,
    number: input.number?.trim() || null,
    title,
    amount_label: input.amountLabel?.trim() || null,
    status: "concept" as const,
    issued_at: null as string | null,
    due_at: null as string | null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_invoices").insert(row);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.invoices.unshift({ ...row, id: newId(), created_at: nowIso() });
    });
  }
  await logActivity({
    organizationId: input.organizationId,
    source: "invoice",
    eventType: "INVOICE_CREATED",
    title,
    actorEmail: input.actorEmail,
  });
  return { ok: true as const };
}

export async function updateSupportStatus(id: string, status: string) {
  if (!isSupportStatus(status)) return fail("Onbekende status.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_support").update({ status, updated_at: nowIso() }).eq("id", id);
    if (error) return fail(error.message);
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const row = store.support.find((item) => item.id === id);
    if (row) {
      row.status = status;
      row.updated_at = nowIso();
    }
  });
  return { ok: true as const };
}

export async function updateInvoiceStatus(id: string, status: string) {
  if (!isInvoiceStatus(status)) return fail("Onbekende status.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_invoices").update({ status }).eq("id", id);
    if (error) return fail(error.message);
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const row = store.invoices.find((item) => item.id === id);
    if (row) row.status = status;
  });
  return { ok: true as const };
}

async function loadTable<T>(table: string, organizationId?: string): Promise<T[]> {
  const supabase = refreshClient();
  if (supabase) {
    let query = supabase.from(table).select("*").order("created_at", { ascending: false });
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data } = await query;
    return (data ?? []) as T[];
  }
  const store = await readStore();
  const key =
    table === "kopvast_proposals"
      ? "proposals"
      : table === "kopvast_invoices"
        ? "invoices"
        : table === "kopvast_notes"
          ? "notes"
          : table === "kopvast_support"
            ? "support"
            : table === "kopvast_activity"
              ? "activity"
              : table === "kopvast_customer_reviews"
                ? "customerReviews"
                : table === "kopvast_brand_profiles"
                  ? "brandProfiles"
                  : null;
  if (!key) return [];
  const rows = store[key] as unknown as Array<T & { organization_id?: string | null; proposal_id?: string }>;
  const filtered = organizationId ? rows.filter((item) => item.organization_id === organizationId) : rows;
  return [...filtered].sort((a, b) => {
    const left = (a as { created_at?: string }).created_at ?? "";
    const right = (b as { created_at?: string }).created_at ?? "";
    return right.localeCompare(left);
  });
}

async function loadOpenTodos(organizationId?: string) {
  const supabase = refreshClient();
  if (supabase) {
    let query = supabase.from("kopvast_todos").select("id, title, status, organization_id").eq("status", "open");
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data } = await query;
    return (data ?? []) as Array<{ id: string; title: string; status: string; organization_id: string | null }>;
  }
  return (await readStore()).todos
    .filter((item) => item.status === "open" && (!organizationId || item.organization_id === organizationId))
    .map((item) => ({ id: item.id, title: item.title, status: item.status, organization_id: item.organization_id }));
}

export async function loadOpenCustomerReviews(): Promise<OpenCustomerReview[]> {
  const [reviews, proposals, organizations] = await Promise.all([
    loadTable<CustomerReviewRow>("kopvast_customer_reviews"),
    loadTable<ProposalRow>("kopvast_proposals"),
    loadOrganizations(),
  ]);
  const open = reviews.filter((item) => item.status === "open");
  return open.map((review) => {
    const proposal = proposals.find((item) => item.id === review.proposal_id);
    const org = organizations.find((item) => item.id === review.candidate_organization_id);
    return {
      ...review,
      proposalTitle: proposal?.title ?? "Voorstel",
      candidateName: org?.name ?? "Bestaande klant",
      contactEmail: proposal?.contact_email ?? null,
      companyName: proposal?.company_name ?? null,
    };
  });
}

async function loadAllProjects() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_projects").select("*");
    return (data ?? []) as ProjectRow[];
  }
  return (await readStore()).projects;
}

async function loadAllRequests() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_requests").select("*");
    return (data ?? []) as RequestRow[];
  }
  return (await readStore()).requests;
}

export async function loadCustomerList(input: { filter: CustomerFilter; q?: string }): Promise<{
  items: CustomerListItem[];
  reviews: OpenCustomerReview[];
}> {
  const [organizations, members, projects, requests, proposals, invoices, support, reviews, todos] = await Promise.all([
    loadOrganizations(),
    loadMembers(),
    loadAllProjects(),
    loadAllRequests(),
    loadTable<ProposalRow>("kopvast_proposals"),
    loadTable<InvoiceRow>("kopvast_invoices"),
    loadTable<SupportRow>("kopvast_support"),
    loadOpenCustomerReviews(),
    loadOpenTodos(),
  ]);
  const q = input.q?.trim().toLowerCase() ?? "";
  const items: CustomerListItem[] = [];
  for (const org of organizations) {
    const facts = listFactsForCustomer({
      organization: org,
      members: members.filter((item) => item.organization_id === org.id),
      projects: projects.filter((item) => item.organization_id === org.id),
      requests: requests.filter((item) => item.organization_id === org.id),
      support: support.filter((item) => item.organization_id === org.id),
      proposals: proposals.filter((item) => item.organization_id === org.id),
      invoices: invoices.filter((item) => item.organization_id === org.id),
      reviews: reviews.filter((item) => item.candidate_organization_id === org.id),
      todos: todos.filter((item) => item.organization_id === org.id),
    });
    const hay = customerSearchHaystack({
      name: org.name,
      website: facts.website,
      contactName: facts.contactName,
      contactEmail: facts.contactEmail,
    });
    if (q && !hay.includes(q)) continue;
    if (!customerMatchesFilter(input.filter, { ...facts, status: org.status })) continue;
    items.push({ organization: org, ...facts });
  }
  return { items, reviews };
}

export async function loadCustomerDossier(organizationId: string): Promise<CustomerDossier | null> {
  const workspace = await loadCustomerWorkspace(organizationId);
  if (!workspace) return null;
  const [leads, proposals, invoices, notes, support, activity, reviews, brandRows, todos] = await Promise.all([
    loadLeads(),
    loadTable<ProposalRow>("kopvast_proposals"),
    loadTable<InvoiceRow>("kopvast_invoices", organizationId),
    loadTable<NoteRow>("kopvast_notes", organizationId),
    loadTable<SupportRow>("kopvast_support", organizationId),
    loadTable<ActivityRow>("kopvast_activity", organizationId),
    loadTable<CustomerReviewRow>("kopvast_customer_reviews"),
    loadBrand(organizationId),
    loadOpenTodos(organizationId),
  ]);
  const orgProposals = proposals.filter(
    (item) => item.organization_id === organizationId || item.inbound_lead_id === workspace.organization.inbound_lead_id
  );
  const orgLeads = leads.filter(
    (item) =>
      item.id === workspace.organization.inbound_lead_id ||
      orgProposals.some((proposal) => proposal.inbound_lead_id === item.id)
  );
  const orgReviews = reviews.filter((item) => orgProposals.some((proposal) => proposal.id === item.proposal_id));
  const prospectActivity = await loadProspectActivity(workspace.organization.prospect_id, organizationId);
  const synthesized = activityFromRecords({
    organizationId,
    organization: workspace.organization,
    leads: orgLeads,
    proposals: orgProposals,
    projects: workspace.projects,
    requests: workspace.requests,
    invoices,
    support,
    notes,
  });
  const facts = listFactsForCustomer({
    organization: workspace.organization,
    members: workspace.members,
    projects: workspace.projects,
    requests: workspace.requests,
    support,
    proposals: orgProposals,
    invoices,
    reviews: orgReviews,
    todos,
  });
  return {
    ...workspace,
    leads: orgLeads,
    proposals: orgProposals,
    invoices,
    notes,
    support,
    brand: brandRows,
    activity: mergeActivity([...activity, ...prospectActivity, ...synthesized]),
    reviews: orgReviews,
    facts,
  };
}

async function loadProspectActivity(prospectId: string | null, organizationId: string): Promise<ActivityRow[]> {
  if (!prospectId) return [];
  const supabase = refreshClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("activity_logs")
    .select("id, event_type, actor_id, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(40);
  return ((data ?? []) as Array<{ id: string; event_type: string; actor_id: string | null; created_at: string }>).map(
    (row) => ({
      id: `prospect-${row.id}`,
      organization_id: organizationId,
      source: "prospect" as const,
      event_type: row.event_type,
      title: row.event_type.replace(/_/g, " "),
      detail: row.actor_id,
      actor_email: row.actor_id,
      related_id: prospectId,
      created_at: row.created_at,
    })
  );
}

async function loadBrand(organizationId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_brand_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    return (data as BrandProfileRow | null) ?? null;
  }
  return (await readStore()).brandProfiles.find((item) => item.organization_id === organizationId) ?? null;
}
