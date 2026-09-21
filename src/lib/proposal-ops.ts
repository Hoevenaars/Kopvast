import { createElement } from "react";
import { render } from "react-email";
import { Resend } from "resend";
import { ProposalEmail } from "@/emails/proposal";
import { proposalMailCopy, proposalMailPlainText } from "@/emails/proposal-copy";
import { fromAddress } from "@/lib/email";
import { logEmailEvent } from "@/lib/email-log";
import { getEmailMode, getTestEmail, recipientForMode } from "@/lib/email-mode";
import { isEmail, normalizeEmail } from "@/lib/product";
import {
  canAcceptProposal,
  centsToEuros,
  defaultProposalTitle,
  evaluateProposalSend,
  eurosToCents,
  formatEuro,
  hasUnsentDraftChanges,
  isProposalStatus,
  isProposalType,
  lineAmountCents,
  nextProposalNumber,
  normalizeProposalLines,
  parseProposalLinesJson,
  projectsFromSnapshot,
  PROPOSAL_ACTIVITY,
  proposalPublicUrl,
  snapshotContent,
  totalsFromLines,
  versionPublicToken,
  type ProposalActivityRow,
  type ProposalDraftInput,
  type ProposalLineInput,
  type ProposalLineRow,
  type ProposalRow,
  type ProposalSnapshot,
  type ProposalStatus,
  type ProposalType,
  type ProposalVersionRow,
} from "@/lib/proposals";
import { refreshClient } from "@/lib/refresh";
import { createTodo, loadTodoBoard } from "@/lib/todo-board";
import { proposalValidityDefault, VAT_RATE } from "@/lib/terms";
import { createToken, hashToken } from "@/lib/tokens";
import { loadLead, loadOrganization, emptyProjectFields } from "@/lib/workspace";
import { mutateStore, newId, nowIso, readStore, type MemberRow } from "@/lib/workspace-store";

export type ProposalResult<T extends object = object> = { ok: true } & T | { ok: false; message: string };

export type ProposalDetail = {
  proposal: ProposalRow;
  lines: ProposalLineRow[];
  versions: ProposalVersionRow[];
  activity: ProposalActivityRow[];
};

export type PublicProposal = {
  proposal: ProposalRow;
  version: ProposalVersionRow;
  snapshot: ProposalSnapshot;
  current: boolean;
};

export type ProposalTodayAction = {
  title: string;
  company: string;
  age: string;
  href: string;
  status: string;
};

type LiveProposal = {
  id: string;
  created_at: string;
  updated_at: string;
  proposal_number: string;
  version: number;
  request_id: string | null;
  prospect_id: string | null;
  customer_id: string | null;
  status: string;
  title: string;
  intro: string | null;
  aanleiding?: string | null;
  type?: string | null;
  scope_summary: string | null;
  planning_text: string | null;
  validity_text: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_organization?: string | null;
  subtotal_ex_vat: number | string | null;
  recurring_monthly_ex_vat: number | string | null;
  public_token_hash: string | null;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at?: string | null;
  question_text?: string | null;
  question_at?: string | null;
  accepted_at: string | null;
  accepted_by_name?: string | null;
  accepted_by_email?: string | null;
  accepted_snapshot?: ProposalSnapshot | null;
  handed_off_at?: string | null;
  created_by_email?: string | null;
};

type LiveLine = {
  id: string;
  proposal_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  quantity: number | string;
  unit_price_ex_vat: number | string;
  line_total_ex_vat?: number | string;
  recurring: boolean;
  recurring_interval: string | null;
};

type LiveVersion = {
  id: string;
  proposal_id: string;
  version: number;
  snapshot: ProposalSnapshot;
  created_at: string;
  sent_at?: string | null;
  first_viewed_at?: string | null;
  public_token_hash?: string | null;
};

type LiveActivity = {
  id: string;
  entity_id: string | null;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function asStatus(value: string | null | undefined): ProposalStatus {
  if (value && isProposalStatus(value)) return value;
  return "DRAFT";
}

function asProposal(row: ProposalRow, token?: string | null, versionId?: string | null): ProposalRow {
  return {
    ...row,
    organization_id: row.organization_id || null,
    inbound_lead_id: row.inbound_lead_id || null,
    prospect_id: row.prospect_id || null,
    current_token: token || row.current_token || null,
    current_version_id: versionId || row.current_version_id || null,
    sent_at: row.sent_at || null,
    first_viewed_at: row.first_viewed_at || null,
    last_viewed_at: row.last_viewed_at || null,
    question_text: row.question_text || null,
    question_at: row.question_at || null,
    accepted_at: row.accepted_at || null,
    accepted_by_name: row.accepted_by_name || null,
    accepted_by_email: row.accepted_by_email || null,
    accepted_snapshot: row.accepted_snapshot || null,
    handed_off_at: row.handed_off_at || null,
    created_by_email: row.created_by_email || null,
  };
}

function fromLiveProposal(row: LiveProposal, token?: string | null, versionId?: string | null): ProposalRow {
  const subtotalCents = eurosToCents(row.subtotal_ex_vat);
  const recurringMonthlyCents = eurosToCents(row.recurring_monthly_ex_vat);
  const vatCents = Math.round(subtotalCents * VAT_RATE);
  return asProposal({
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    number: row.proposal_number,
    version: row.version,
    type: isProposalType(row.type ?? "") ? (row.type as ProposalType) : "maatwerk",
    status: asStatus(row.status),
    title: row.title ?? "",
    intro: row.intro ?? "",
    aanleiding: row.aanleiding ?? "",
    scope_summary: row.scope_summary ?? "",
    planning: row.planning_text ?? "",
    validity_text: row.validity_text ?? "",
    recipient_name: row.recipient_name ?? "",
    recipient_email: row.recipient_email ?? "",
    recipient_organization: row.recipient_organization ?? "",
    organization_id: row.customer_id,
    inbound_lead_id: row.request_id,
    prospect_id: row.prospect_id,
    current_token: token ?? null,
    current_version_id: versionId ?? null,
    subtotal_cents: subtotalCents,
    recurring_monthly_cents: recurringMonthlyCents,
    vat_cents: vatCents,
    total_cents: subtotalCents + vatCents,
    sent_at: row.sent_at,
    first_viewed_at: row.first_viewed_at,
    last_viewed_at: row.last_viewed_at ?? null,
    question_text: row.question_text ?? null,
    question_at: row.question_at ?? null,
    accepted_at: row.accepted_at,
    accepted_by_name: row.accepted_by_name ?? null,
    accepted_by_email: row.accepted_by_email ?? null,
    accepted_snapshot: row.accepted_snapshot ?? null,
    handed_off_at: row.handed_off_at ?? null,
    created_by_email: row.created_by_email ?? null,
  });
}

function toLiveProposal(row: ProposalRow, token?: string | null) {
  const totals = amountsFromLines([]);
  return {
    proposal_number: row.number,
    version: row.version,
    request_id: row.inbound_lead_id,
    prospect_id: row.prospect_id,
    customer_id: row.organization_id,
    status: row.status,
    title: row.title,
    intro: row.intro,
    aanleiding: row.aanleiding,
    type: row.type,
    scope_summary: row.scope_summary,
    planning_text: row.planning,
    validity_text: row.validity_text,
    recipient_name: row.recipient_name,
    recipient_email: row.recipient_email,
    recipient_organization: row.recipient_organization,
    subtotal_ex_vat: centsToEuros(row.subtotal_cents || totals.subtotal_cents),
    recurring_monthly_ex_vat: centsToEuros(row.recurring_monthly_cents || totals.recurring_monthly_cents),
    public_token_hash: token ? hashToken(token) : null,
    sent_at: row.sent_at,
    first_viewed_at: row.first_viewed_at,
    last_viewed_at: row.last_viewed_at,
    question_text: row.question_text,
    question_at: row.question_at,
    accepted_at: row.accepted_at,
    accepted_by_name: row.accepted_by_name,
    accepted_by_email: row.accepted_by_email,
    accepted_snapshot: row.accepted_snapshot,
    handed_off_at: row.handed_off_at,
    created_by_email: row.created_by_email,
    updated_at: row.updated_at,
  };
}

function fromLiveLine(row: LiveLine): ProposalLineRow {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    kind: row.recurring ? "recurring" : "scope",
    title: row.title,
    description: row.description ?? "",
    quantity: Number(row.quantity),
    unit_price_cents: eurosToCents(row.unit_price_ex_vat),
    sort_order: row.sort_order,
  };
}

function fromLiveVersion(row: LiveVersion): ProposalVersionRow {
  const snapshot = row.snapshot;
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    version: row.version,
    token: versionPublicToken({ token: "", snapshot }),
    snapshot,
    sent_at: row.sent_at || row.created_at,
    first_viewed_at: row.first_viewed_at ?? null,
    created_at: row.created_at,
  };
}

function fromLiveActivity(row: LiveActivity): ProposalActivityRow {
  const metadata = row.metadata ?? {};
  const actorEmail =
    (typeof metadata.actor_email === "string" ? metadata.actor_email : null) || row.actor_id;
  return {
    id: row.id,
    proposal_id: row.entity_id ?? "",
    event_type: row.event_type,
    actor_type: row.actor_type,
    actor_email: actorEmail,
    metadata,
    created_at: row.created_at,
  };
}

function withSnapshotToken(snapshot: ProposalSnapshot, token: string): ProposalSnapshot {
  return { ...snapshot, publicToken: token };
}

function draftSnapshot(proposal: ProposalRow, lines: ProposalLineInput[], sentAt = proposal.sent_at || nowIso()) {
  return snapshotContent({
    number: proposal.number,
    version: proposal.version,
    type: proposal.type,
    title: proposal.title,
    intro: proposal.intro,
    aanleiding: proposal.aanleiding,
    scopeSummary: proposal.scope_summary,
    planning: proposal.planning,
    validity: proposal.validity_text,
    organization: proposal.recipient_organization,
    recipientName: proposal.recipient_name,
    recipientEmail: proposal.recipient_email,
    lines,
    sentAt,
  });
}

async function logActivity(
  proposalId: string,
  eventType: string,
  actorEmail: string | null,
  metadata: Record<string, unknown> = {},
  actorType = "human"
) {
  const supabase = refreshClient();
  if (supabase) {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("prospect_id, customer_id")
      .eq("id", proposalId)
      .maybeSingle();
    const { error } = await supabase.from("activity_logs").insert({
      entity_type: "proposal",
      entity_id: proposalId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorEmail,
      prospect_id: proposal?.prospect_id ?? null,
      customer_id: proposal?.customer_id ?? null,
      metadata: { ...metadata, actor_email: actorEmail },
    });
    if (error) console.error("[kopvast] Voorstel-activiteit mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.proposalActivity.unshift({
      id: newId(),
      proposal_id: proposalId,
      event_type: eventType,
      actor_type: actorType,
      actor_email: actorEmail,
      metadata,
      created_at: nowIso(),
    });
  });
}

export function draftFromForm(formData: FormData): ProposalDraftInput {
  const typeValue = String(formData.get("type") ?? "maatwerk");
  return {
    title: String(formData.get("title") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    aanleiding: String(formData.get("aanleiding") ?? ""),
    scopeSummary: String(formData.get("scope_summary") ?? ""),
    planning: String(formData.get("planning") ?? ""),
    validityText: String(formData.get("validity_text") ?? ""),
    recipientName: String(formData.get("recipient_name") ?? ""),
    recipientEmail: String(formData.get("recipient_email") ?? ""),
    recipientOrganization: String(formData.get("recipient_organization") ?? ""),
    type: isProposalType(typeValue) ? typeValue : "maatwerk",
    lines: parseProposalLinesJson(String(formData.get("lines") ?? "")),
  };
}

export async function loadProposals(): Promise<ProposalRow[]> {
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("proposals").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[kopvast] Voorstellen laden mislukt", error.message);
      return [];
    }
    return ((data ?? []) as LiveProposal[]).map((row) => fromLiveProposal(row));
  }
  return (await readStore()).voorstellen
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => asProposal(row));
}

async function loadLiveRelated(id: string) {
  const supabase = refreshClient();
  if (!supabase) return { lines: [], versions: [], activity: [] };
  const [lines, versions, activity] = await Promise.all([
    supabase.from("proposal_lines").select("*").eq("proposal_id", id).order("sort_order"),
    supabase.from("proposal_versions").select("*").eq("proposal_id", id).order("version", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "proposal")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  return {
    lines: ((lines.data ?? []) as LiveLine[]).map(fromLiveLine),
    versions: ((versions.data ?? []) as LiveVersion[]).map(fromLiveVersion),
    activity: ((activity.data ?? []) as LiveActivity[]).map(fromLiveActivity),
  };
}

export async function loadProposal(id: string): Promise<ProposalDetail | null> {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const related = await loadLiveRelated(id);
    const current = related.versions.find((item) => item.version === data.version) ?? related.versions[0] ?? null;
    return {
      proposal: fromLiveProposal(data as LiveProposal, current ? versionPublicToken(current) : null, current?.id ?? null),
      lines: related.lines,
      versions: related.versions,
      activity: related.activity,
    };
  }
  const store = await readStore();
  const proposal = store.voorstellen.find((item) => item.id === id);
  if (!proposal) return null;
  return {
    proposal: asProposal(proposal),
    lines: store.voorstelLines
      .filter((item) => item.proposal_id === id)
      .sort((a, b) => a.sort_order - b.sort_order),
    versions: store.proposalVersions
      .filter((item) => item.proposal_id === id)
      .sort((a, b) => b.version - a.version),
    activity: store.proposalActivity
      .filter((item) => item.proposal_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function loadPublicProposal(token: string): Promise<PublicProposal | null> {
  const value = token.trim();
  if (!value) return null;
  const supabase = refreshClient();
  if (supabase) {
    const tokenHash = hashToken(value);
    const { data: hashedVersion } = await supabase
      .from("proposal_versions")
      .select("*")
      .eq("public_token_hash", tokenHash)
      .maybeSingle();
    let version = hashedVersion as LiveVersion | null;
    let proposal: LiveProposal | null = null;
    if (version) {
      const { data } = await supabase.from("proposals").select("*").eq("id", version.proposal_id).maybeSingle();
      proposal = (data as LiveProposal | null) ?? null;
    } else {
      const { data } = await supabase.from("proposals").select("*").eq("public_token_hash", tokenHash).maybeSingle();
      proposal = (data as LiveProposal | null) ?? null;
      if (proposal) {
        const { data: current } = await supabase
          .from("proposal_versions")
          .select("*")
          .eq("proposal_id", proposal.id)
          .eq("version", proposal.version)
          .maybeSingle();
        version = (current as LiveVersion | null) ?? null;
      }
    }
    if (!proposal || !version) return null;
    const mappedVersion = fromLiveVersion({ ...version, snapshot: { ...version.snapshot, publicToken: value } });
    return {
      proposal: fromLiveProposal(proposal, value, mappedVersion.id),
      version: mappedVersion,
      snapshot: mappedVersion.snapshot,
      current: proposal.version === mappedVersion.version,
    };
  }
  const store = await readStore();
  const version = store.proposalVersions.find((item) => item.token === value);
  if (!version) return null;
  const proposal = store.voorstellen.find((item) => item.id === version.proposal_id);
  if (!proposal) return null;
  return {
    proposal: asProposal(proposal),
    version,
    snapshot: version.snapshot,
    current: proposal.version === version.version,
  };
}

async function nextNumber() {
  const existing = (await loadProposals()).map((item) => item.number);
  return nextProposalNumber(existing);
}

function emptyProposal(input: {
  number: string;
  type: ProposalType;
  recipientName: string;
  recipientEmail: string;
  recipientOrganization: string;
  title: string;
  aanleiding: string;
  organizationId?: string | null;
  leadId?: string | null;
  prospectId?: string | null;
  createdBy: string | null;
}): ProposalRow {
  const now = nowIso();
  return {
    id: newId(),
    created_at: now,
    updated_at: now,
    number: input.number,
    version: 1,
    type: input.type,
    status: "DRAFT",
    title: input.title,
    intro: "",
    aanleiding: input.aanleiding,
    scope_summary: "",
    planning: "",
    validity_text: proposalValidityDefault,
    recipient_name: input.recipientName,
    recipient_email: normalizeEmail(input.recipientEmail),
    recipient_organization: input.recipientOrganization,
    organization_id: input.organizationId ?? null,
    inbound_lead_id: input.leadId ?? null,
    prospect_id: input.prospectId ?? null,
    current_token: null,
    current_version_id: null,
    subtotal_cents: 0,
    recurring_monthly_cents: 0,
    vat_cents: 0,
    total_cents: 0,
    sent_at: null,
    first_viewed_at: null,
    last_viewed_at: null,
    question_text: null,
    question_at: null,
    accepted_at: null,
    accepted_by_name: null,
    accepted_by_email: null,
    accepted_snapshot: null,
    handed_off_at: null,
    created_by_email: input.createdBy,
  };
}

export type ProposalRequestRef = {
  id: string;
  requestId: string;
  status: string;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function preferProposalRef<T extends { status: string }>(items: T[]): T | undefined {
  return items.find((item) => item.status === "DRAFT" || item.status === "READY") ?? items[0];
}

function refFromLive(row: LiveProposal): ProposalRequestRef | null {
  if (!row.request_id) return null;
  return {
    id: row.id,
    requestId: row.request_id,
    status: row.status,
    title: row.title ?? "",
    notes: row.scope_summary || row.aanleiding || row.intro || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function refFromLocal(row: ProposalRow): ProposalRequestRef | null {
  if (!row.inbound_lead_id) return null;
  return {
    id: row.id,
    requestId: row.inbound_lead_id,
    status: row.status,
    title: row.title,
    notes: row.scope_summary || row.aanleiding || row.intro || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findLatestProposalsForRequests(leadIds: string[]): Promise<Map<string, ProposalRequestRef>> {
  const refs = new Map<string, ProposalRequestRef>();
  const ids = [...new Set(leadIds.filter(Boolean))];
  if (!ids.length) return refs;

  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("proposals")
      .select("id, request_id, status, title, scope_summary, aanleiding, intro, created_at, updated_at")
      .in("request_id", ids)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[kopvast] Voorstellen bij aanvragen laden mislukt", error.message);
      return refs;
    }
    const grouped = new Map<string, LiveProposal[]>();
    for (const row of (data ?? []) as LiveProposal[]) {
      if (!row.request_id) continue;
      const current = grouped.get(row.request_id) ?? [];
      current.push(row);
      grouped.set(row.request_id, current);
    }
    for (const [requestId, rows] of grouped) {
      const preferred = preferProposalRef(rows);
      const ref = preferred ? refFromLive(preferred) : null;
      if (ref) refs.set(requestId, ref);
    }
    return refs;
  }

  const store = await readStore();
  const grouped = new Map<string, ProposalRow[]>();
  for (const row of store.voorstellen) {
    if (!row.inbound_lead_id || !ids.includes(row.inbound_lead_id)) continue;
    const current = grouped.get(row.inbound_lead_id) ?? [];
    current.push(row);
    grouped.set(row.inbound_lead_id, current);
  }
  for (const [requestId, rows] of grouped) {
    const preferred = preferProposalRef(rows);
    const ref = preferred ? refFromLocal(preferred) : null;
    if (ref) refs.set(requestId, ref);
  }
  return refs;
}

export async function findActiveProposalForRequest(leadId: string): Promise<string | null> {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("proposals")
      .select("id")
      .eq("request_id", leadId)
      .in("status", ["DRAFT", "READY"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }
  const store = await readStore();
  return (
    store.voorstellen.find(
      (item) => item.inbound_lead_id === leadId && (item.status === "DRAFT" || item.status === "READY")
    )?.id ?? null
  );
}

export async function createProposal(input: {
  type?: string;
  recipientName: string;
  recipientEmail: string;
  recipientOrganization: string;
  leadId?: string | null;
  organizationId?: string | null;
  createdBy: string | null;
}): Promise<ProposalResult<{ id: string }>> {
  if (input.leadId) {
    const existing = await findActiveProposalForRequest(input.leadId);
    if (existing) return { ok: true, id: existing };
  }
  const recipientEmail = normalizeEmail(input.recipientEmail);
  if (!isEmail(recipientEmail)) return fail("Vul een geldig e-mailadres in.");
  const organization = input.recipientOrganization.trim() || input.recipientName.trim();
  if (!organization) return fail("Vul een organisatie of naam in.");
  let type: ProposalType = isProposalType(input.type ?? "") ? (input.type as ProposalType) : "maatwerk";
  let aanleiding = "";
  const organizationId = input.organizationId ?? null;
  const leadId = input.leadId ?? null;
  let prospectId: string | null = null;
  if (leadId) {
    const lead = await loadLead(leadId);
    if (!lead) return fail("Aanvraag niet gevonden.");
    type = lead.type === "website" ? "website" : "maatwerk";
    aanleiding = [lead.request_detail, lead.notes, lead.functionality, lead.scale, lead.timing]
      .filter(Boolean)
      .join("\n\n");
    prospectId = lead.prospect_id ?? null;
  }
  if (organizationId) {
    const org = await loadOrganization(organizationId);
    if (!org) return fail("Klant niet gevonden.");
  }
  const row = emptyProposal({
    number: await nextNumber(),
    type,
    recipientName: input.recipientName.trim(),
    recipientEmail,
    recipientOrganization: organization,
    title: defaultProposalTitle(organization),
    aanleiding,
    organizationId,
    leadId,
    prospectId,
    createdBy: input.createdBy,
  });
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("proposals").insert(toLiveProposal(row)).select("id").single();
    if (error || !data) {
      if (input.leadId) {
        const raced = await findActiveProposalForRequest(input.leadId);
        if (raced) return { ok: true, id: raced };
      }
      console.error("[kopvast] Voorstel aanmaken mislukt", error?.message);
      return fail("Voorstel opslaan is tijdelijk niet beschikbaar.");
    }
    await logActivity(data.id as string, PROPOSAL_ACTIVITY.CREATED, input.createdBy, { number: row.number });
    return { ok: true, id: data.id as string };
  }
  await mutateStore((store) => {
    store.voorstellen.unshift(row);
  });
  await logActivity(row.id, PROPOSAL_ACTIVITY.CREATED, input.createdBy, { number: row.number });
  return { ok: true, id: row.id };
}

function amountsFromLines(lines: ProposalLineInput[]) {
  const totals = totalsFromLines(normalizeProposalLines(lines));
  return {
    subtotal_cents: totals.subtotalCents,
    recurring_monthly_cents: totals.recurringMonthlyCents,
    vat_cents: totals.vatCents,
    total_cents: totals.totalCents,
  };
}

function liveAmounts(lines: ProposalLineInput[]) {
  const amounts = amountsFromLines(lines);
  return {
    subtotal_ex_vat: centsToEuros(amounts.subtotal_cents),
    recurring_monthly_ex_vat: centsToEuros(amounts.recurring_monthly_cents),
  };
}

async function replaceLines(proposalId: string, lines: ProposalLineInput[]) {
  const normalized = normalizeProposalLines(lines).map((line, index) => ({
    id: line.id || newId(),
    proposal_id: proposalId,
    kind: line.kind,
    title: line.title,
    description: line.description,
    quantity: line.quantity,
    unit_price_cents: line.unitPriceCents,
    sort_order: index,
  }));
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("proposal_lines").delete().eq("proposal_id", proposalId);
    if (normalized.length) {
      const { error } = await supabase.from("proposal_lines").insert(
        normalized.map((line) => ({
          proposal_id: line.proposal_id,
          sort_order: line.sort_order,
          title: line.title,
          description: line.description,
          quantity: line.quantity,
          unit_price_ex_vat: centsToEuros(line.unit_price_cents),
          line_total_ex_vat: centsToEuros(lineAmountCents(line.quantity, line.unit_price_cents)),
          recurring: line.kind === "recurring",
          recurring_interval: line.kind === "recurring" ? "month" : null,
        }))
      );
      if (error) console.error("[kopvast] Voorstelregels opslaan mislukt", error.message);
    }
    return;
  }
  await mutateStore((store) => {
    store.voorstelLines = store.voorstelLines.filter((item) => item.proposal_id !== proposalId);
    store.voorstelLines.push(...normalized);
  });
}

export async function saveProposalDraft(
  id: string,
  input: ProposalDraftInput,
  actorEmail: string | null
): Promise<ProposalResult<{ id: string }>> {
  const detail = await loadProposal(id);
  if (!detail) return fail("Voorstel niet gevonden.");
  if (detail.proposal.status === "ACCEPTED") return fail("Een geaccepteerd voorstel is vastgezet.");
  const type = isProposalType(input.type) ? input.type : detail.proposal.type;
  const lines = normalizeProposalLines(input.lines);
  const amounts = amountsFromLines(lines);
  const patch = {
    updated_at: nowIso(),
    type,
    title: input.title.trim() || defaultProposalTitle(input.recipientOrganization || detail.proposal.recipient_organization),
    intro: input.intro.trim(),
    aanleiding: input.aanleiding.trim(),
    scope_summary: input.scopeSummary.trim(),
    planning: input.planning.trim(),
    validity_text: input.validityText.trim() || proposalValidityDefault,
    recipient_name: input.recipientName.trim(),
    recipient_email: normalizeEmail(input.recipientEmail),
    recipient_organization: input.recipientOrganization.trim() || input.recipientName.trim(),
    ...amounts,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("proposals")
      .update({
        updated_at: patch.updated_at,
        type: patch.type,
        title: patch.title,
        intro: patch.intro,
        aanleiding: patch.aanleiding,
        scope_summary: patch.scope_summary,
        planning_text: patch.planning,
        validity_text: patch.validity_text,
        recipient_name: patch.recipient_name,
        recipient_email: patch.recipient_email,
        recipient_organization: patch.recipient_organization,
        ...liveAmounts(lines),
      })
      .eq("id", id);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const proposal = store.voorstellen.find((item) => item.id === id);
      if (proposal) Object.assign(proposal, patch);
    });
  }
  await replaceLines(id, lines);
  await logActivity(id, PROPOSAL_ACTIVITY.SAVED, actorEmail, { version: detail.proposal.version });
  return { ok: true, id };
}

async function sendProposalEmail(input: {
  proposalId: string;
  version: number;
  to: string;
  organization: string;
  name: string;
  url: string;
  amount: string;
}) {
  const copy = proposalMailCopy(input);
  const from = fromAddress();
  const mode = await getEmailMode();
  const testEmail = await getTestEmail();
  const recipient = recipientForMode(input.to, mode, testEmail);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await logEmailEvent({
      kind: "voorstel",
      to: recipient.to,
      subject: copy.subject,
      status: "failed",
      error: "RESEND_API_KEY ontbreekt",
    });
    return { mailed: false, message: "Het voorstel staat klaar, maar e-mail is niet geconfigureerd." };
  }
  const resend = new Resend(apiKey);
  const html = await render(
    createElement(ProposalEmail, {
      name: input.name,
      organization: input.organization,
      url: input.url,
      amount: input.amount,
      testMode: recipient.mode === "TEST",
    })
  );
  const { data, error } = await resend.emails.send(
    {
      from,
      to: recipient.to,
      replyTo: process.env.CONTACT_TO_EMAIL?.trim() || from,
      subject: copy.subject,
      text: proposalMailPlainText(input, recipient.mode === "TEST" ? recipient.to : undefined),
      html,
    },
    { idempotencyKey: `voorstel/${input.proposalId}/v${input.version}/${Math.floor(Date.now() / 15_000)}` }
  );
  await logEmailEvent({
    kind: "voorstel",
    to: recipient.to,
    subject: copy.subject,
    status: error ? "failed" : "sent",
    resendId: data?.id,
    error: error?.message,
  });
  if (error) {
    console.error("[kopvast] Voorstelmail mislukt", error.message);
    return { mailed: false, message: "Het voorstel staat klaar, maar de mail is niet verzonden." };
  }
  return { mailed: true as const };
}

export async function sendProposal(
  id: string,
  input: ProposalDraftInput,
  actorEmail: string | null
): Promise<ProposalResult<{ id: string; url: string; mailed: boolean; message?: string }>> {
  const saved = await saveProposalDraft(id, input, actorEmail);
  if (!saved.ok) return saved;
  const detail = await loadProposal(id);
  if (!detail) return fail("Voorstel niet gevonden.");
  const proposal = detail.proposal;
  if (proposal.status === "ACCEPTED") return fail("Een geaccepteerd voorstel is vastgezet.");
  const lines = detail.lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    title: line.title,
    description: line.description,
    quantity: Number(line.quantity),
    unitPriceCents: line.unit_price_cents,
  }));
  const issues = evaluateProposalSend({ email: proposal.recipient_email, lines });
  if (issues.length) return fail(issues[0]);
  const latest = detail.versions[0] ?? null;
  const preview = draftSnapshot(proposal, lines);
  const changed = hasUnsentDraftChanges(preview, latest?.snapshot ?? null);
  let version = latest;
  let token = latest ? versionPublicToken(latest) : "";
  if (changed || !latest) {
    const nextVersion = latest ? latest.version + 1 : 1;
    token = createToken();
    const sentAt = nowIso();
    const snapshot = withSnapshotToken(
      snapshotContent({
        number: proposal.number,
        version: nextVersion,
        type: proposal.type,
        title: proposal.title,
        intro: proposal.intro,
        aanleiding: proposal.aanleiding,
        scopeSummary: proposal.scope_summary,
        planning: proposal.planning,
        validity: proposal.validity_text,
        organization: proposal.recipient_organization,
        recipientName: proposal.recipient_name,
        recipientEmail: proposal.recipient_email,
        lines,
        sentAt,
      }),
      token
    );
    const versionRow: ProposalVersionRow = {
      id: newId(),
      proposal_id: id,
      version: nextVersion,
      token,
      snapshot,
      sent_at: sentAt,
      first_viewed_at: null,
      created_at: sentAt,
    };
    const amounts = amountsFromLines(lines);
    const supabase = refreshClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("proposal_versions")
        .insert({
          proposal_id: id,
          version: nextVersion,
          snapshot,
          sent_at: sentAt,
          first_viewed_at: null,
          public_token_hash: hashToken(token),
        })
        .select("id")
        .single();
      if (error || !data) {
        console.error("[kopvast] Voorstelversie opslaan mislukt", error?.message);
        return fail("Versie vastzetten is mislukt.");
      }
      await supabase
        .from("proposals")
        .update({
          updated_at: sentAt,
          version: nextVersion,
          status: "SENT",
          public_token_hash: hashToken(token),
          sent_at: sentAt,
          first_viewed_at: null,
          ...liveAmounts(lines),
        })
        .eq("id", id);
      version = { ...versionRow, id: data.id as string };
    } else {
      await mutateStore((store) => {
        store.proposalVersions.unshift(versionRow);
        const current = store.voorstellen.find((item) => item.id === id);
        if (current) {
          Object.assign(current, {
            updated_at: sentAt,
            version: nextVersion,
            status: "SENT" as ProposalStatus,
            current_token: token,
            current_version_id: versionRow.id,
            sent_at: sentAt,
            first_viewed_at: null,
            ...amounts,
          });
        }
      });
      version = versionRow;
    }
    await logActivity(id, PROPOSAL_ACTIVITY.SENT, actorEmail, { version: version.version, token: true });
  }
  const url = proposalPublicUrl(token);
  const mailed = await sendProposalEmail({
    proposalId: id,
    version: version?.version ?? proposal.version,
    to: proposal.recipient_email,
    organization: proposal.recipient_organization,
    name: proposal.recipient_name || proposal.recipient_organization,
    url,
    amount: formatEuro(proposal.subtotal_cents),
  });
  if (proposal.inbound_lead_id) {
    const { saveAanvraagNextAction } = await import("@/lib/aanvragen");
    const { NEXT_ACTIONS } = await import("@/lib/commercial");
    await saveAanvraagNextAction({
      id: proposal.inbound_lead_id,
      nextAction: NEXT_ACTIONS.WAIT_ACCEPT,
      nextActionAt: new Date().toISOString(),
      actorEmail: actorEmail ?? "kopvast.nl",
    }).catch(() => null);
  }
  return { ok: true, id, url, mailed: mailed.mailed, message: mailed.message };
}

export async function recordProposalView(token: string, options?: { admin?: boolean }) {
  if (options?.admin) return { ok: true as const, skipped: true };
  const publicProposal = await loadPublicProposal(token);
  if (!publicProposal) return fail("Voorstel niet gevonden.");
  const now = nowIso();
  const first = !publicProposal.proposal.first_viewed_at && publicProposal.current;
  const nextStatus: ProposalStatus =
    publicProposal.current && publicProposal.proposal.status === "SENT" ? "VIEWED" : publicProposal.proposal.status;
  const supabase = refreshClient();
  if (supabase) {
    await supabase
      .from("proposal_versions")
      .update({ first_viewed_at: publicProposal.version.first_viewed_at || now })
      .eq("id", publicProposal.version.id);
    await supabase
      .from("proposals")
      .update({
        updated_at: now,
        last_viewed_at: now,
        first_viewed_at: publicProposal.proposal.first_viewed_at || (publicProposal.current ? now : publicProposal.proposal.first_viewed_at),
        status: nextStatus,
      })
      .eq("id", publicProposal.proposal.id);
  } else {
    await mutateStore((store) => {
      const proposal = store.voorstellen.find((item) => item.id === publicProposal.proposal.id);
      const version = store.proposalVersions.find((item) => item.id === publicProposal.version.id);
      if (version && !version.first_viewed_at) version.first_viewed_at = now;
      if (proposal) {
        proposal.updated_at = now;
        proposal.last_viewed_at = now;
        if (publicProposal.current && !proposal.first_viewed_at) proposal.first_viewed_at = now;
        proposal.status = nextStatus;
      }
    });
  }
  if (first) {
    await logActivity(publicProposal.proposal.id, PROPOSAL_ACTIVITY.VIEWED, publicProposal.proposal.recipient_email, {
      version: publicProposal.version.version,
    }, "customer");
  }
  return { ok: true as const, skipped: false };
}

async function createQuestionTodo(proposal: ProposalRow) {
  const board = await loadTodoBoard();
  const bucket = board.buckets.find((item) => item.name.toLowerCase().includes("deze week")) ?? board.buckets[0];
  await createTodo({
    title: `Vraag bij voorstel ${proposal.number}`,
    bucket_id: bucket?.id ?? null,
    organization_id: proposal.organization_id,
    due_at: new Date().toISOString().slice(0, 10),
    note: proposal.question_text,
    priority: "hoog",
  });
}

export async function askProposalQuestion(token: string, question: string): Promise<ProposalResult<{ id: string }>> {
  const text = question.trim();
  if (text.length < 8) return fail("Zet je vraag in een paar zinnen.");
  const publicProposal = await loadPublicProposal(token);
  if (!publicProposal) return fail("Voorstel niet gevonden.");
  if (!publicProposal.current) return fail("Deze versie is niet meer actueel. Stuur je vraag via het laatste voorstel.");
  if (publicProposal.proposal.status === "ACCEPTED") return fail("Dit voorstel is al geaccepteerd.");
  const now = nowIso();
  const patch = {
    updated_at: now,
    status: "QUESTION" as ProposalStatus,
    question_text: text,
    question_at: now,
  };
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("proposals").update(patch).eq("id", publicProposal.proposal.id);
  } else {
    await mutateStore((store) => {
      const proposal = store.voorstellen.find((item) => item.id === publicProposal.proposal.id);
      if (proposal) Object.assign(proposal, patch);
    });
  }
  await logActivity(publicProposal.proposal.id, PROPOSAL_ACTIVITY.QUESTION, publicProposal.proposal.recipient_email, {
    version: publicProposal.version.version,
  }, "customer");
  await createQuestionTodo({ ...publicProposal.proposal, ...patch });
  return { ok: true, id: publicProposal.proposal.id };
}

export async function handleAcceptedProposal(proposalId: string): Promise<ProposalResult<{ organizationId: string; already?: boolean }>> {
  const detail = await loadProposal(proposalId);
  if (!detail) return fail("Voorstel niet gevonden.");
  const proposal = detail.proposal;
  if (proposal.handed_off_at && proposal.organization_id) {
    return { ok: true, organizationId: proposal.organization_id, already: true };
  }
  const snapshot = proposal.accepted_snapshot || detail.versions[0]?.snapshot;
  if (!snapshot) return fail("Er is geen vastgezet voorstel om over te dragen.");
  let organizationId = proposal.organization_id;
  const supabase = refreshClient();
  if (!organizationId && proposal.inbound_lead_id) {
    if (supabase) {
      const { data } = await supabase
        .from("kopvast_organizations")
        .select("id")
        .eq("inbound_lead_id", proposal.inbound_lead_id)
        .maybeSingle();
      organizationId = (data?.id as string | undefined) ?? null;
    } else {
      organizationId =
        (await readStore()).organizations.find((item) => item.inbound_lead_id === proposal.inbound_lead_id)?.id ?? null;
    }
  }
  const projects = projectsFromSnapshot(snapshot);
  if (supabase) {
    if (!organizationId) {
      const { data: created, error } = await supabase
        .from("kopvast_organizations")
        .insert({
          name: proposal.recipient_organization || proposal.recipient_name,
          status: "onboarding",
          inbound_lead_id: proposal.inbound_lead_id,
          notes: `Uit voorstel ${proposal.number}`,
        })
        .select("id")
        .single();
      if (error || !created) return fail("Klant aanmaken mislukt.");
      organizationId = created.id as string;
    }
    const email = normalizeEmail(proposal.accepted_by_email || proposal.recipient_email);
    const { data: existingMember } = await supabase
      .from("kopvast_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();
    if (!existingMember) {
      await supabase.from("kopvast_members").insert({
        organization_id: organizationId,
        name: proposal.accepted_by_name || proposal.recipient_name || proposal.recipient_organization,
        email,
        role: "owner",
        access_enabled: true,
      });
    }
    const { data: existingProjects } = await supabase
      .from("kopvast_projects")
      .select("id, summary")
      .eq("organization_id", organizationId);
    const already = (existingProjects ?? []).some((item) => String(item.summary ?? "").includes(proposal.number));
    if (!already && projects.length) {
      await supabase.from("kopvast_projects").insert(
        projects.map((project) => ({
          ...project,
          ...emptyProjectFields(),
          organization_id: organizationId,
          summary: `${project.summary} (${proposal.number} v${proposal.version})`,
        }))
      );
    }
    if (proposal.inbound_lead_id) {
      await supabase.from("inbound_leads").update({ status: "OMGEZET" }).eq("id", proposal.inbound_lead_id);
    }
    await supabase
      .from("proposals")
      .update({
        updated_at: nowIso(),
        customer_id: organizationId,
        handed_off_at: nowIso(),
      })
      .eq("id", proposalId);
  } else {
    const result = await mutateStore((store) => {
      if (!organizationId) {
        const created = {
          id: newId(),
          name: proposal.recipient_organization || proposal.recipient_name,
          website: null,
          status: "onboarding" as const,
          inbound_lead_id: proposal.inbound_lead_id,
          prospect_id: null,
          notes: `Uit voorstel ${proposal.number}`,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        store.organizations.unshift(created);
        organizationId = created.id;
      }
      const email = normalizeEmail(proposal.accepted_by_email || proposal.recipient_email);
      const hasMember = store.members.some(
        (item) => item.organization_id === organizationId && item.email === email
      );
      if (!hasMember) {
        store.members.push({
          id: newId(),
          organization_id: organizationId,
          name: proposal.accepted_by_name || proposal.recipient_name || proposal.recipient_organization,
          email,
          role: "owner",
          access_enabled: true,
        } satisfies MemberRow);
      }
      const already = store.projects.some(
        (item) => item.organization_id === organizationId && (item.summary ?? "").includes(proposal.number)
      );
      if (!already) {
        for (const project of projects) {
          store.projects.push({
            ...project,
            ...emptyProjectFields(),
            id: newId(),
            organization_id: organizationId,
            started_at: null,
            due_at: null,
            live_at: null,
            created_at: nowIso(),
            summary: `${project.summary} (${proposal.number} v${proposal.version})`,
          });
        }
      }
      const current = store.voorstellen.find((item) => item.id === proposalId);
      if (current) {
        current.organization_id = organizationId;
        current.handed_off_at = nowIso();
        current.updated_at = nowIso();
      }
      return organizationId;
    });
    organizationId = result;
  }
  await logActivity(proposalId, PROPOSAL_ACTIVITY.HANDOFF, proposal.accepted_by_email, { organizationId }, "system");
  return { ok: true, organizationId: organizationId as string };
}

export async function acceptProposalAsAdmin(
  proposalId: string,
  actorEmail: string | null
): Promise<ProposalResult<{ id: string; already?: boolean; organizationId?: string }>> {
  const detail = await loadProposal(proposalId);
  if (!detail) return fail("Voorstel niet gevonden.");
  const actor = actorEmail && isEmail(normalizeEmail(actorEmail)) ? normalizeEmail(actorEmail) : detail.proposal.recipient_email;
  const name = detail.proposal.recipient_name || detail.proposal.recipient_organization || actor;

  const finish = async (already: boolean) => {
    const { afterProposalAccepted } = await import("@/lib/commercial-handoffs");
    const handed = await afterProposalAccepted(proposalId);
    if (!handed.ok) return handed;
    return { ok: true as const, id: proposalId, already, organizationId: handed.organizationId };
  };

  if (detail.proposal.status === "ACCEPTED") return finish(true);

  const lines = detail.lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    title: line.title,
    description: line.description,
    quantity: Number(line.quantity),
    unitPriceCents: line.unit_price_cents,
  }));
  const snapshot = detail.proposal.accepted_snapshot || detail.versions[0]?.snapshot || draftSnapshot(detail.proposal, lines);
  const now = nowIso();
  const patch = {
    updated_at: now,
    status: "ACCEPTED" as ProposalStatus,
    accepted_at: now,
    accepted_by_name: name,
    accepted_by_email: actor,
    accepted_snapshot: snapshot,
  };

  const supabase = refreshClient();
  if (supabase) {
    const { data: current } = await supabase.from("proposals").select("status").eq("id", proposalId).maybeSingle();
    if (current?.status === "ACCEPTED") return finish(true);
    await supabase.from("proposals").update(patch).eq("id", proposalId);
  } else {
    const already = await mutateStore((store) => {
      const proposal = store.voorstellen.find((item) => item.id === proposalId);
      if (!proposal) return "missing" as const;
      if (proposal.status === "ACCEPTED") return "already" as const;
      Object.assign(proposal, patch);
      return "ok" as const;
    });
    if (already === "missing") return fail("Voorstel niet gevonden.");
    if (already === "already") return finish(true);
  }

  await logActivity(
    proposalId,
    PROPOSAL_ACTIVITY.ACCEPTED,
    actor,
    { version: detail.proposal.version, amount: snapshot.totals.subtotalCents, source: "admin" },
    "human"
  );
  return finish(false);
}

export async function acceptProposal(
  token: string,
  input: { name: string; email: string; acceptedTerms: boolean }
): Promise<ProposalResult<{ id: string; already?: boolean; organizationId?: string }>> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (name.length < 2) return fail("Vul je naam in.");
  if (!isEmail(email)) return fail("Vul een geldig e-mailadres in.");
  if (!input.acceptedTerms) return fail("Bevestig dat je akkoord gaat met de voorwaarden.");
  const publicProposal = await loadPublicProposal(token);
  if (!publicProposal) return fail("Voorstel niet gevonden.");
  const allowed = canAcceptProposal(publicProposal);
  if (!allowed.ok) return fail(allowed.message);
  if (allowed.already) return finishPublicAccept(publicProposal.proposal.id, true);

  const now = nowIso();
  const patch = {
    updated_at: now,
    status: "ACCEPTED" as ProposalStatus,
    accepted_at: now,
    accepted_by_name: name,
    accepted_by_email: email,
    accepted_snapshot: publicProposal.snapshot,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { data: current } = await supabase
      .from("proposals")
      .select("status")
      .eq("id", publicProposal.proposal.id)
      .maybeSingle();
    if (current?.status === "ACCEPTED") return finishPublicAccept(publicProposal.proposal.id, true);
    await supabase.from("proposals").update(patch).eq("id", publicProposal.proposal.id);
  } else {
    const already = await mutateStore((store) => {
      const proposal = store.voorstellen.find((item) => item.id === publicProposal.proposal.id);
      if (!proposal) return false;
      if (proposal.status === "ACCEPTED") return true;
      Object.assign(proposal, patch);
      return false;
    });
    if (already) return finishPublicAccept(publicProposal.proposal.id, true);
  }
  await logActivity(publicProposal.proposal.id, PROPOSAL_ACTIVITY.ACCEPTED, email, {
    version: publicProposal.version.version,
    amount: publicProposal.snapshot.totals.subtotalCents,
  }, "customer");
  return finishPublicAccept(publicProposal.proposal.id, false);
}

async function finishPublicAccept(
  proposalId: string,
  already: boolean
): Promise<ProposalResult<{ id: string; already?: boolean; organizationId?: string }>> {
  const { afterProposalAccepted } = await import("@/lib/commercial-handoffs");
  const handed = await afterProposalAccepted(proposalId);
  if (!handed.ok) return { ok: true, id: proposalId, already };
  return { ok: true, id: proposalId, already, organizationId: handed.organizationId };
}

export async function loadProposalTodayActions(): Promise<ProposalTodayAction[]> {
  const proposals = await loadProposals();
  return proposals
    .filter((item) => item.status === "QUESTION")
    .map((item) => ({
      title: `Vraag bij ${item.number}`,
      company: item.recipient_organization || item.recipient_name,
      age: item.question_at ? formatAge(item.question_at) : "vandaag",
      href: `/admin/voorstellen/${item.id}`,
      status: "Actie nodig",
    }));
}

function formatAge(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.round(delta / 3_600_000));
  if (hours < 1) return "zojuist";
  if (hours < 24) return `${hours} uur`;
  const days = Math.round(hours / 24);
  return `${days} d`;
}

export function currentVersionOf(detail: ProposalDetail) {
  return detail.versions.find((item) => item.version === detail.proposal.version) ?? null;
}
