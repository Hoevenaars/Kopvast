import { newId, nowIso } from "@/lib/workspace-store";
import { canonicalDomainFromInput } from "@/lib/acquire-score";
import { scoutServiceClient } from "./auth";
import { mutateLocalScout, readLocalScout } from "./store";
import { emptyEnrichment, type DuplicateLead, type ScoutDraft, type ScoutLead, type ScoutLeadEvent, type ScoutScan, type ScoutSource, type ScoutStatus, type ScoutUser } from "./types";

function mapLead(row: Record<string, unknown>): ScoutLead {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    url: String(row.url),
    domain: String(row.domain),
    canonical_url: (row.canonical_url as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    source: row.source as ScoutSource,
    status: row.status as ScoutStatus,
    pipeline_stage: String(row.pipeline_stage ?? "capture"),
    score: typeof row.score === "number" ? row.score : row.score == null ? null : Number(row.score),
    why_interesting: (row.why_interesting as string | null) ?? null,
    commercial_summary: (row.commercial_summary as string | null) ?? null,
    biggest_opportunity: (row.biggest_opportunity as string | null) ?? null,
    opportunities: Array.isArray(row.opportunities) ? (row.opportunities as ScoutLead["opportunities"]) : [],
    enrichment: (row.enrichment as ScoutLead["enrichment"]) ?? emptyEnrichment(),
    prospect_id: (row.prospect_id as string | null) ?? null,
    last_scan_at: (row.last_scan_at as string | null) ?? null,
    last_error: (row.last_error as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function findLeadByDomain(userId: string, domain: string): Promise<ScoutLead | null> {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase.from("scout_leads").select("*").eq("user_id", userId).ilike("domain", domain).maybeSingle();
    return data ? mapLead(data as Record<string, unknown>) : null;
  }
  const store = await readLocalScout();
  return store.leads.find((lead) => lead.user_id === userId && lead.domain === domain) ?? null;
}

export async function findProspectDuplicate(domain: string): Promise<DuplicateLead | null> {
  const supabase = scoutServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("prospects")
    .select("id, company_name, domain, status, opportunity_score, last_scan_at")
    .eq("is_archived", false)
    .ilike("domain", domain)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    company_name: data.company_name,
    domain: data.domain,
    status: data.status,
    score: data.opportunity_score,
    last_scan_at: data.last_scan_at,
  };
}

export function toDuplicate(lead: ScoutLead): DuplicateLead {
  return {
    id: lead.id,
    company_name: lead.company_name,
    domain: lead.domain,
    status: lead.status,
    score: lead.score,
    last_scan_at: lead.last_scan_at,
  };
}

export async function insertLead(input: {
  user: ScoutUser;
  url: string;
  domain: string;
  canonicalUrl: string;
  note: string | null;
  source: ScoutSource;
}): Promise<ScoutLead> {
  const now = nowIso();
  const row = {
    id: newId(),
    user_id: input.user.id,
    url: input.url,
    domain: input.domain,
    canonical_url: input.canonicalUrl,
    company_name: null,
    note: input.note,
    industry: null,
    city: null,
    description: null,
    email: null,
    phone: null,
    linkedin_url: null,
    source: input.source,
    status: "nieuw" as const,
    pipeline_stage: "capture",
    score: null,
    why_interesting: null,
    commercial_summary: null,
    biggest_opportunity: null,
    opportunities: [],
    enrichment: emptyEnrichment(),
    prospect_id: null,
    last_scan_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  } satisfies ScoutLead;

  const supabase = scoutServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("scout_leads").insert(row).select("*").single();
    if (error || !data) throw new Error("Lead opslaan is mislukt.");
    return mapLead(data as Record<string, unknown>);
  }
  await mutateLocalScout((store) => {
    store.leads.unshift(row);
  });
  return row;
}

export async function getLeadById(id: string): Promise<ScoutLead | null> {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase.from("scout_leads").select("*").eq("id", id).maybeSingle();
    return data ? mapLead(data as Record<string, unknown>) : null;
  }
  const store = await readLocalScout();
  return store.leads.find((lead) => lead.id === id) ?? null;
}

export async function getLead(userId: string, id: string): Promise<ScoutLead | null> {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase.from("scout_leads").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    return data ? mapLead(data as Record<string, unknown>) : null;
  }
  const store = await readLocalScout();
  return store.leads.find((lead) => lead.user_id === userId && lead.id === id) ?? null;
}

export async function listLeads(userId: string, input?: { status?: ScoutStatus; minScore?: number }) {
  const supabase = scoutServiceClient();
  if (supabase) {
    let query = supabase.from("scout_leads").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (input?.status) query = query.eq("status", input.status);
    if (typeof input?.minScore === "number") query = query.gte("score", input.minScore);
    const { data, error } = await query;
    if (error) throw new Error("Leads laden is mislukt.");
    return (data ?? []).map((row) => mapLead(row as Record<string, unknown>));
  }
  const store = await readLocalScout();
  return store.leads.filter((lead) => {
    if (lead.user_id !== userId) return false;
    if (input?.status && lead.status !== input.status) return false;
    if (typeof input?.minScore === "number" && (lead.score ?? -1) < input.minScore) return false;
    return true;
  });
}

export async function listConceptLeads(userId: string) {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("scout_leads")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "concept_klaar")
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Concepten laden is mislukt.");
    return (data ?? []).map((row) => mapLead(row as Record<string, unknown>));
  }
  const store = await readLocalScout();
  return store.leads.filter((lead) => lead.user_id === userId && lead.status === "concept_klaar");
}

export async function updateLead(id: string, patch: Partial<ScoutLead>) {
  const supabase = scoutServiceClient();
  const next = { ...patch, updated_at: nowIso() };
  if (supabase) {
    const { error } = await supabase.from("scout_leads").update(next).eq("id", id);
    if (error) throw new Error("Lead bijwerken is mislukt.");
    return;
  }
  await mutateLocalScout((store) => {
    const lead = store.leads.find((item) => item.id === id);
    if (lead) Object.assign(lead, next);
  });
}

export async function appendEvent(event: Omit<ScoutLeadEvent, "id" | "created_at"> & { id?: string }) {
  const row: ScoutLeadEvent = {
    id: event.id ?? newId(),
    lead_id: event.lead_id,
    event_type: event.event_type,
    actor_type: event.actor_type,
    metadata: event.metadata ?? {},
    created_at: nowIso(),
  };
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase.from("scout_lead_events").insert(row);
    return row;
  }
  await mutateLocalScout((store) => {
    store.events.push(row);
  });
  return row;
}

export async function insertScan(scan: Omit<ScoutScan, "created_at"> & { created_at?: string }) {
  const row: ScoutScan = { ...scan, created_at: scan.created_at ?? nowIso() };
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("scout_website_scans").insert(row).select("*").single();
    if (error || !data) throw new Error("Scan opslaan is mislukt.");
    return data as ScoutScan;
  }
  await mutateLocalScout((store) => {
    store.scans.unshift(row);
  });
  return row;
}

export async function latestScan(leadId: string): Promise<ScoutScan | null> {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("scout_website_scans")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ScoutScan | null) ?? null;
  }
  const store = await readLocalScout();
  return store.scans.find((scan) => scan.lead_id === leadId) ?? null;
}

export async function upsertDraft(leadId: string, input: { subject: string; message: string }): Promise<ScoutDraft> {
  const now = nowIso();
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from("scout_outreach_drafts")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("scout_outreach_drafts")
        .update({ subject: input.subject, message: input.message, updated_at: now })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new Error("Concept opslaan is mislukt.");
      return data as ScoutDraft;
    }
    const row = {
      id: newId(),
      lead_id: leadId,
      subject: input.subject,
      message: input.message,
      channel: "email",
      status: "draft",
      approved_at: null,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from("scout_outreach_drafts").insert(row).select("*").single();
    if (error || !data) throw new Error("Concept opslaan is mislukt.");
    return data as ScoutDraft;
  }
  return mutateLocalScout((store) => {
    const existing = store.drafts.find((draft) => draft.lead_id === leadId && draft.status === "draft");
    if (existing) {
      existing.subject = input.subject;
      existing.message = input.message;
      existing.updated_at = now;
      return existing;
    }
    const row: ScoutDraft = {
      id: newId(),
      lead_id: leadId,
      subject: input.subject,
      message: input.message,
      channel: "email",
      status: "draft",
      approved_at: null,
      created_at: now,
      updated_at: now,
    };
    store.drafts.unshift(row);
    return row;
  });
}

export async function getDraft(leadId: string): Promise<ScoutDraft | null> {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("scout_outreach_drafts")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ScoutDraft | null) ?? null;
  }
  const store = await readLocalScout();
  return store.drafts.find((draft) => draft.lead_id === leadId) ?? null;
}

export async function saveDraft(userId: string, leadId: string, input: { subject: string; message: string }) {
  const lead = await getLead(userId, leadId);
  if (!lead) throw new Error("Lead niet gevonden.");
  const draft = await upsertDraft(leadId, input);
  await appendEvent({
    lead_id: leadId,
    event_type: "draft_modified",
    actor_type: "human",
    metadata: {},
  });
  return draft;
}

export async function approveDraft(userId: string, leadId: string) {
  const lead = await getLead(userId, leadId);
  if (!lead) throw new Error("Lead niet gevonden.");
  const now = nowIso();
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase
      .from("scout_outreach_drafts")
      .update({ status: "approved", approved_at: now, updated_at: now })
      .eq("lead_id", leadId)
      .eq("status", "draft");
  } else {
    await mutateLocalScout((store) => {
      for (const draft of store.drafts) {
        if (draft.lead_id === leadId && draft.status === "draft") {
          draft.status = "approved";
          draft.approved_at = now;
          draft.updated_at = now;
        }
      }
    });
  }
  await updateLead(leadId, { status: "benaderd", pipeline_stage: "approve" });
  await appendEvent({ lead_id: leadId, event_type: "draft_approved", actor_type: "human", metadata: {} });
}

export async function listEvents(leadId: string) {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("scout_lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    return (data ?? []) as ScoutLeadEvent[];
  }
  const store = await readLocalScout();
  return store.events.filter((event) => event.lead_id === leadId).reverse();
}

export { canonicalDomainFromInput };
