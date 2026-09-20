import { revalidatePath } from "next/cache";
import { logProspectActivity } from "@/lib/acquisition-activity";
import { MAIL_TEMPLATE_VERSION } from "@/lib/acquisition-constants";
import { MANUAL_REASONS_PROMPT_VERSION } from "@/lib/acquisition/manual-reasons";
import { UNREACHABLE_SITE_PROMPT_VERSION, UNREACHABLE_SITE_TEMPLATE_VERSION } from "@/lib/acquisition/unreachable-site-mail";
import { withManualEmailEnrichment } from "@/lib/contact-email";
import { isEmail, normalizeEmail, workspaceRoutes } from "@/lib/product";
import { nowIso } from "@/lib/workspace-store";
import { scoutServiceClient } from "./auth";
import { mergeScoutNote, prospectStatusFromScout } from "./crm-map";
import { getDraft, getLeadById, mapLead } from "./leads";
import { mutateLocalScout } from "./store";
import {
  SCOUT_STATUS_LABELS,
  type ScoutDraft,
  type ScoutLead,
  type ScoutOpportunity,
  type ScoutSource,
  type ScoutStatus,
} from "./types";

export {
  isScoutSourceReference,
  mergeScoutNote,
  prospectStatusFromScout,
  SCOUT_SOURCE_LABELS,
  scoutSourceLabel,
} from "./crm-map";

const LOCKED_PROSPECT_STATUSES = new Set(["CONVERTED", "ARCHIVED"]);
const SENT_MAIL_STATUSES = new Set(["queued", "sent", "delivered", "bounced"]);

export type AdminScoutCapture = {
  id: string;
  prospect_id: string | null;
  domain: string;
  company_name: string | null;
  note: string | null;
  source: ScoutSource;
  status: ScoutStatus;
  score: number | null;
  why_interesting: string | null;
  commercial_summary: string | null;
  biggest_opportunity: string | null;
  opportunities: ScoutOpportunity[];
  email: string | null;
  phone: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  draft_subject: string | null;
  draft_message: string | null;
  draft_status: ScoutDraft["status"] | null;
};

function mapCapture(lead: ScoutLead, draft: ScoutDraft | null): AdminScoutCapture {
  return {
    id: lead.id,
    prospect_id: lead.prospect_id,
    domain: lead.domain,
    company_name: lead.company_name,
    note: lead.note,
    source: lead.source,
    status: lead.status,
    score: lead.score,
    why_interesting: lead.why_interesting,
    commercial_summary: lead.commercial_summary,
    biggest_opportunity: lead.biggest_opportunity,
    opportunities: lead.opportunities,
    email: lead.email,
    phone: lead.phone,
    last_error: lead.last_error,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    draft_subject: draft?.subject ?? null,
    draft_message: draft?.message ?? null,
    draft_status: draft?.status ?? null,
  };
}

async function withDraft(lead: ScoutLead): Promise<AdminScoutCapture> {
  const draft = await getDraft(lead.id);
  return mapCapture(lead, draft);
}

export async function listAdminScoutCaptures(limit = 80): Promise<AdminScoutCapture[]> {
  const supabase = scoutServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("scout_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  const leads = data.map((row) => mapLead(row as Record<string, unknown>));
  const ids = leads.map((lead) => lead.id);
  const { data: drafts } = await supabase
    .from("scout_outreach_drafts")
    .select("*")
    .in("lead_id", ids)
    .order("updated_at", { ascending: false });
  const draftByLead = new Map<string, ScoutDraft>();
  for (const row of drafts ?? []) {
    const draft = row as ScoutDraft;
    if (!draftByLead.has(draft.lead_id)) draftByLead.set(draft.lead_id, draft);
  }
  return leads.map((lead) => mapCapture(lead, draftByLead.get(lead.id) ?? null));
}

export async function loadScoutCaptureForProspect(prospectId: string): Promise<AdminScoutCapture | null> {
  const supabase = scoutServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("scout_leads")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return withDraft(mapLead(data as Record<string, unknown>));
}

export async function scoutProspectIds(limit = 200): Promise<string[]> {
  const supabase = scoutServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("scout_leads")
    .select("prospect_id")
    .not("prospect_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return [...new Set((data ?? []).map((row) => String(row.prospect_id)).filter(Boolean))];
}

function revalidateAdminSurfaces(prospectId?: string | null) {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminAcquisition);
  revalidatePath(workspaceRoutes.adminScout);
  revalidatePath("/scout");
  if (prospectId) revalidatePath(`${workspaceRoutes.adminAcquisition}/${prospectId}`);
}

export async function syncProspectFromScout(leadId: string): Promise<string | null> {
  const supabase = scoutServiceClient();
  const lead = await getLeadById(leadId);
  if (!supabase || !lead?.prospect_id) return lead?.prospect_id ?? null;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, company_name, notes, status, mail_status, is_archived")
    .eq("id", lead.prospect_id)
    .maybeSingle();
  if (!prospect) return lead.prospect_id;

  const locked = LOCKED_PROSPECT_STATUSES.has(String(prospect.status)) || Boolean(prospect.is_archived);
  const nextStatus = prospectStatusFromScout(lead.status, lead.score);
  const draft = await getDraft(lead.id);
  const patch: Record<string, unknown> = {
    company_name: lead.company_name || prospect.company_name,
    notes: mergeScoutNote(prospect.notes as string | null, lead.note),
    opportunity_score: lead.score,
    last_scan_at: lead.last_scan_at ?? nowIso(),
    last_activity_at: nowIso(),
    updated_at: nowIso(),
  };
  if (!locked) {
    patch.status = nextStatus;
    if (draft && !SENT_MAIL_STATUSES.has(String(prospect.mail_status ?? ""))) {
      patch.mail_status = "draft";
    }
  }

  const { error } = await supabase.from("prospects").update(patch).eq("id", lead.prospect_id);
  if (error) console.error("[scout] Prospect bijwerken mislukt", error.message);

  if (lead.email && isEmail(lead.email)) {
    const email = normalizeEmail(lead.email);
    const { data: existing } = await supabase
      .from("prospect_contacts")
      .select("id")
      .eq("prospect_id", lead.prospect_id)
      .ilike("email", email)
      .maybeSingle();
    if (!existing) {
      await supabase.from("prospect_contacts").insert({
        prospect_id: lead.prospect_id,
        email,
        email_source: "scout",
        contact_status: "UNKNOWN",
        do_not_contact: false,
      });
    }
  }

  if (draft?.subject && draft.message && !locked) {
    await upsertScoutOutreachDraft(lead.prospect_id, draft);
  }

  await logProspectActivity(supabase, {
    prospectId: lead.prospect_id,
    eventType: "SCOUT_CAPTURED",
    actorType: "agent",
    actorId: "kopvast-scout",
    oldStatus: String(prospect.status),
    newStatus: locked ? String(prospect.status) : nextStatus,
    metadata: {
      scoutLeadId: lead.id,
      source: lead.source,
      scoutStatus: lead.status,
      score: lead.score,
      note: lead.note,
    },
  });

  revalidateAdminSurfaces(lead.prospect_id);
  return lead.prospect_id;
}

export async function syncScoutEmailFromProspect(prospectId: string, email: string) {
  const supabase = scoutServiceClient();
  const updatedAt = nowIso();
  if (supabase) {
    const { data } = await supabase.from("scout_leads").select("id, enrichment").eq("prospect_id", prospectId);
    for (const row of data ?? []) {
      await supabase
        .from("scout_leads")
        .update({
          email,
          enrichment: withManualEmailEnrichment(row.enrichment as Record<string, unknown>, email),
          updated_at: updatedAt,
        })
        .eq("id", row.id);
    }
    revalidateAdminSurfaces(prospectId);
    return;
  }
  await mutateLocalScout((store) => {
    for (const lead of store.leads) {
      if (lead.prospect_id === prospectId) {
        lead.email = email;
        lead.enrichment = withManualEmailEnrichment(lead.enrichment, email);
        lead.updated_at = updatedAt;
      }
    }
  });
}

async function upsertScoutOutreachDraft(prospectId: string, draft: ScoutDraft) {
  const supabase = scoutServiceClient();
  if (!supabase) return;
  const { data: existing } = await supabase
    .from("email_messages")
    .select("id, status, prompt_version")
    .eq("prospect_id", prospectId)
    .eq("kind", "acquisition_outreach")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && existing.status !== "draft") return;
  const editableVersions = new Set([
    "kopvast-scout",
    UNREACHABLE_SITE_PROMPT_VERSION,
    MANUAL_REASONS_PROMPT_VERSION,
    null,
    undefined,
  ]);
  if (existing && !editableVersions.has(existing.prompt_version)) return;

  const { data: contact } = await supabase
    .from("prospect_contacts")
    .select("id, email")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const to = contact?.email || "draft@scout.kopvast.nl";
  const unreachable = existing?.prompt_version === UNREACHABLE_SITE_PROMPT_VERSION;
  const manual = existing?.prompt_version === MANUAL_REASONS_PROMPT_VERSION;
  const row = {
    subject: draft.subject,
    body_text: draft.message,
    status: "draft",
    prompt_version: unreachable
      ? UNREACHABLE_SITE_PROMPT_VERSION
      : manual
        ? MANUAL_REASONS_PROMPT_VERSION
        : "kopvast-scout",
    template_version: unreachable
      ? UNREACHABLE_SITE_TEMPLATE_VERSION
      : manual
        ? MAIL_TEMPLATE_VERSION
        : "scout-capture",
    intended_to_email: contact?.email ?? null,
    to_email: to,
    contact_id: contact?.id ?? null,
    updated_at: nowIso(),
  };
  if (existing?.id) {
    await supabase.from("email_messages").update(row).eq("id", existing.id);
    return;
  }
  await supabase.from("email_messages").insert({
    ...row,
    prospect_id: prospectId,
    kind: "acquisition_outreach",
    provider: "resend",
    findings_used: [],
  });
}

export { SCOUT_STATUS_LABELS };
