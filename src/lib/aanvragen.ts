import { isProductFit, pickCommercialFindings, type ProductFit } from "@/lib/acquisition-constants";
import {
  AANVRAAG_ACTIVITY,
  defaultProductFitForSource,
  domainFromWebsite,
  existingDraftProposal,
  inferredProductFit,
  isAanvraagFilter,
  isAanvraagStatus,
  isDueRequestAction,
  mapLiveProposalStatus,
  matchesAanvraagFilter,
  matchesAanvraagSearch,
  payloadRecord,
  proposalLinesForFit,
  recentManualDuplicate,
  type AanvraagActivity,
  type AanvraagFilter,
  type AanvraagRecord,
  type ProposalRecord,
  type ProposalStatus,
} from "@/lib/aanvragen-model";
import { isEmail, normalizeEmail, workspaceRoutes } from "@/lib/product";
import { findLatestProposalsForRequests, type ProposalRequestRef } from "@/lib/proposal-ops";
import { refreshClient } from "@/lib/refresh";
import { mutateStore, newId, nowIso, readLocalLeads, readStore } from "@/lib/workspace-store";

export type AanvraagListQuery = {
  filter?: string;
  q?: string;
};

export type LinkedScan = {
  prospectId: string;
  company: string;
  domain: string;
  websiteUrl: string;
  href: string;
  findings: Array<{
    id: string;
    title: string;
    description: string;
    finding_type: string;
    category: string;
    severity: string;
  }>;
};

export type AanvraagDetail = AanvraagRecord & {
  proposal: ProposalRecord | null;
  activities: AanvraagActivity[];
  scan: LinkedScan | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapLeadRow(row: Record<string, unknown>, proposal?: { id: string; status: string } | null): AanvraagRecord {
  const payload = payloadRecord(row.payload);
  const productFit = isProductFit(String(row.product_fit ?? "")) ? (row.product_fit as ProductFit) : inferredProductFit({
    product_fit: null,
    type: String(row.type ?? ""),
    status: String(row.status ?? ""),
  });
  return {
    id: String(row.id),
    created_at: String(row.created_at ?? nowIso()),
    type: String(row.type ?? "website"),
    status: String(row.status ?? "NIEUW"),
    company_name: asString(row.company_name) || null,
    website: asString(row.website) || null,
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: asString(row.phone) || null,
    pages: asString(row.pages) || null,
    has_brand: asString(row.has_brand) || null,
    notes: asString(row.notes) || null,
    request_detail: asString(row.request_detail) || null,
    functionality: asString(row.functionality) || null,
    scale: asString(row.scale) || null,
    timing: asString(row.timing) || null,
    source: asString(row.source) || (typeof payload?.source === "string" ? payload.source : null),
    product_fit: productFit,
    prospect_id: asString(row.prospect_id) || null,
    next_action: asString(row.next_action) || null,
    next_action_at: asString(row.next_action_at) || null,
    call_notes: asString(row.call_notes) || null,
    qualification_notes: asString(row.qualification_notes) || null,
    payload,
    proposal_id: proposal?.id ?? null,
    proposal_status: mapLiveProposalStatus(proposal?.status),
  };
}

function proposalFromRef(ref: ProposalRequestRef | null | undefined, leadId: string): ProposalRecord | null {
  if (!ref) return null;
  return {
    id: ref.id,
    inbound_lead_id: leadId,
    status: mapLiveProposalStatus(ref.status) ?? "DRAFT",
    product_fit: null,
    title: ref.title,
    notes: ref.notes,
    created_at: ref.createdAt,
    updated_at: ref.updatedAt,
    lines: [],
  };
}

function actionAge(iso: string | null) {
  if (!iso) return "—";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}u`;
  return `${Math.round(hours / 24)}d`;
}

export type RequestTodayAction = {
  title: string;
  company: string;
  age: string;
  href: string;
  status: string;
};

function requestActionFromRow(row: Pick<AanvraagRecord, "id" | "company_name" | "name" | "next_action" | "next_action_at">): RequestTodayAction {
  return {
    title: row.next_action?.trim() || "Aanvraag opvolgen",
    company: row.company_name?.trim() || row.name,
    age: actionAge(row.next_action_at),
    href: `${workspaceRoutes.adminAanvragen}/${row.id}`,
    status: "Actie nodig",
  };
}

function applyQuery(rows: AanvraagRecord[], query: AanvraagListQuery) {
  const filter: AanvraagFilter = query.filter && isAanvraagFilter(query.filter) ? query.filter : "alles";
  const q = query.q ?? "";
  return rows.filter((row) => matchesAanvraagFilter(row, filter) && matchesAanvraagSearch(row, q));
}

async function logActivity(input: {
  leadId: string;
  eventType: string;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const row = {
    inbound_lead_id: input.leadId,
    event_type: input.eventType,
    actor_type: "human" as const,
    actor_id: input.actorEmail ?? "kopvast.nl",
    metadata: input.metadata ?? {},
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_lead_activities").insert(row);
    if (error) console.error("[kopvast] Aanvraag-activiteit opslaan mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.aanvraagActivities.unshift({
      ...row,
      id: newId(),
      created_at: nowIso(),
    });
  });
}

async function localFromFormLeads(): Promise<AanvraagRecord[]> {
  const [store, formLeads] = await Promise.all([readStore(), readLocalLeads()]);
  const byId = new Map(store.aanvragen.map((item) => [item.id, item]));
  for (const lead of formLeads) {
    if (byId.has(lead.id)) continue;
    byId.set(
      lead.id,
      mapLeadRow({
        ...lead,
        source: lead.type === "maatwerk" ? "maatwerk" : "website-aanvraag",
        product_fit: lead.type === "maatwerk" ? "CUSTOM_FIT" : "STANDARD_FIT",
        payload: { source: lead.type === "maatwerk" ? "maatwerk" : "website-aanvraag" },
      })
    );
  }
  const proposals = store.aanvraagProposals;
  const liveRefs = await findLatestProposalsForRequests([...byId.keys()]);
  return [...byId.values()]
    .map((row) => {
      const live = liveRefs.get(row.id);
      if (live) {
        return {
          ...row,
          proposal_id: live.id,
          proposal_status: mapLiveProposalStatus(live.status),
        };
      }
      const draft = existingDraftProposal(proposals, row.id);
      const any = draft ?? proposals.find((item) => item.inbound_lead_id === row.id) ?? null;
      return { ...row, proposal_id: any?.id ?? null, proposal_status: mapLiveProposalStatus(any?.status) };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listAanvragen(query: AanvraagListQuery = {}): Promise<{ items: AanvraagRecord[]; configured: boolean }> {
  const supabase = refreshClient();
  if (!supabase) {
    return { items: applyQuery(await localFromFormLeads(), query), configured: false };
  }

  const { data, error } = await supabase.from("inbound_leads").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[kopvast] Aanvragen laden mislukt", error.message);
    return { items: [], configured: true };
  }

  const ids = (data ?? []).map((row) => String((row as { id: string }).id));
  const proposalByLead = await findLatestProposalsForRequests(ids);
  const items = (data ?? []).map((row) => {
    const ref = proposalByLead.get(String((row as { id: string }).id));
    return mapLeadRow(row as Record<string, unknown>, ref ? { id: ref.id, status: ref.status } : null);
  });
  return { items: applyQuery(items, query), configured: true };
}

export async function loadAanvraag(id: string): Promise<AanvraagDetail | null> {
  const supabase = refreshClient();
  if (!supabase) {
    const rows = await localFromFormLeads();
    const row = rows.find((item) => item.id === id);
    if (!row) return null;
    const store = await readStore();
    const live = (await findLatestProposalsForRequests([id])).get(id);
    const proposal =
      proposalFromRef(live, id) ??
      store.aanvraagProposals.find((item) => item.id === row.proposal_id) ??
      existingDraftProposal(store.aanvraagProposals, id);
    const lines = store.proposalLines.filter((item) => item.proposal_id === proposal?.id).sort((a, b) => a.sort_order - b.sort_order);
    return {
      ...row,
      proposal: proposal ? { ...proposal, lines } : null,
      activities: store.aanvraagActivities.filter((item) => item.inbound_lead_id === id),
      scan: null,
    };
  }

  const { data } = await supabase.from("inbound_leads").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const [{ data: activities }, proposalRefs] = await Promise.all([
    supabase.from("kopvast_lead_activities").select("*").eq("inbound_lead_id", id).order("created_at", { ascending: false }).limit(40),
    findLatestProposalsForRequests([id]),
  ]);

  const proposalRef = proposalRefs.get(id) ?? null;
  const proposal = proposalFromRef(proposalRef, id);

  const mapped = mapLeadRow(data as Record<string, unknown>, proposal ? { id: proposal.id, status: proposal.status } : null);
  return {
    ...mapped,
    proposal: proposal ? { ...proposal, product_fit: mapped.product_fit } : null,
    activities: ((activities ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      inbound_lead_id: id,
      event_type: String(item.event_type ?? ""),
      actor_type: String(item.actor_type ?? "human"),
      actor_id: asString(item.actor_id) || null,
      metadata: payloadRecord(item.metadata) ?? {},
      created_at: String(item.created_at ?? nowIso()),
    })),
    scan: mapped.prospect_id ? await loadLinkedScan(mapped.prospect_id) : null,
  };
}

export async function loadDueRequestActions(): Promise<RequestTodayAction[]> {
  const supabase = refreshClient();
  if (!supabase) {
    const rows = await localFromFormLeads();
    return rows.filter((row) => isDueRequestAction(row)).slice(0, 8).map(requestActionFromRow);
  }

  const { data, error } = await supabase
    .from("inbound_leads")
    .select("id, company_name, name, next_action, next_action_at, status")
    .not("next_action", "is", null)
    .not("next_action_at", "is", null)
    .lte("next_action_at", new Date().toISOString())
    .order("next_action_at", { ascending: true })
    .limit(24);
  if (error) {
    console.error("[kopvast] Aanvraag-acties laden mislukt", error.message);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id),
      company_name: asString(row.company_name) || null,
      name: String(row.name ?? ""),
      next_action: asString(row.next_action) || null,
      next_action_at: asString(row.next_action_at) || null,
      status: String(row.status ?? ""),
    }))
    .filter((row) => isDueRequestAction(row))
    .slice(0, 8)
    .map(requestActionFromRow);
}

async function loadLinkedScan(prospectId: string): Promise<LinkedScan | null> {
  const supabase = refreshClient();
  if (!supabase) return null;
  const [{ data: prospect }, { data: findings }] = await Promise.all([
    supabase.from("prospects").select("id, company_name, domain, website_url").eq("id", prospectId).maybeSingle(),
    supabase.from("findings").select("id, title, description, finding_type, category, severity").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(40),
  ]);
  if (!prospect) return null;
  const picked = pickCommercialFindings((findings ?? []) as LinkedScan["findings"], 5);
  return {
    prospectId,
    company: asString((prospect as { company_name?: string }).company_name) || String((prospect as { domain: string }).domain),
    domain: String((prospect as { domain: string }).domain),
    websiteUrl: String((prospect as { website_url: string }).website_url),
    href: `/admin/acquisitie/${prospectId}`,
    findings: picked,
  };
}

export async function createManualAanvraag(input: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  notes?: string;
  productFit?: string;
  status?: string;
  actorEmail: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const company = input.company.trim();
  if (!company) return { ok: false, message: "Organisatie is verplicht." };
  if (!name || !isEmail(email)) return { ok: false, message: "Contactnaam en een geldig e-mailadres zijn verplicht." };

  const productFit = isProductFit(input.productFit ?? "") ? (input.productFit as ProductFit) : defaultProductFitForSource("MANUAL");
  const status = isAanvraagStatus(input.status ?? "") ? input.status : "NIEUW";
  const row = {
    type: productFit === "CUSTOM_FIT" ? "maatwerk" : "website",
    status,
    company_name: company,
    website: input.website?.trim() || null,
    name,
    email,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
    request_detail: input.notes?.trim() || null,
    consent: true,
    source: "MANUAL",
    product_fit: productFit,
    payload: {
      source: "MANUAL",
      name,
      email,
      company_name: company,
      website: input.website?.trim() || "",
      notes: input.notes?.trim() || "",
      product_fit: productFit,
      status,
    },
  };

  const supabase = refreshClient();
  if (supabase) {
    const { data: existingRows } = await supabase
      .from("inbound_leads")
      .select("id, email, company_name, created_at, source")
      .ilike("email", email)
      .eq("source", "MANUAL")
      .order("created_at", { ascending: false })
      .limit(5);
    const existing = recentManualDuplicate(
      (existingRows ?? []) as Array<{ id: string; email: string; company_name: string | null; created_at: string; source?: string | null }>,
      { email, company }
    );
    if (existing) return { ok: true, id: String((existing as { id: string }).id) };

    const { data, error } = await supabase.from("inbound_leads").insert(row).select("id").single();
    if (error || !data) {
      console.error("[kopvast] Handmatige aanvraag opslaan mislukt", error?.message);
      return { ok: false, message: "Aanvraag opslaan is mislukt." };
    }
    await logActivity({
      leadId: data.id as string,
      eventType: AANVRAAG_ACTIVITY.REQUEST_CREATED,
      actorEmail: input.actorEmail,
      metadata: { source: "MANUAL" },
    });
    return { ok: true, id: data.id as string };
  }

  return mutateStore((store) => {
    const existing = recentManualDuplicate(store.aanvragen, { email, company });
    if (existing) return { ok: true as const, id: existing.id };
    const id = newId();
    store.aanvragen.unshift(
      mapLeadRow({
        ...row,
        id,
        created_at: nowIso(),
        prospect_id: null,
        next_action: null,
        next_action_at: null,
        call_notes: null,
        qualification_notes: null,
      })
    );
    store.aanvraagActivities.unshift({
      id: newId(),
      inbound_lead_id: id,
      event_type: AANVRAAG_ACTIVITY.REQUEST_CREATED,
      actor_type: "human",
      actor_id: input.actorEmail,
      metadata: { source: "MANUAL" },
      created_at: nowIso(),
    });
    return { ok: true as const, id };
  });
}

export async function updateAanvraagQualification(input: {
  id: string;
  status?: string;
  productFit?: string;
  qualificationNotes?: string;
  actorEmail: string;
}) {
  const current = await loadAanvraag(input.id);
  if (!current) return { ok: false as const, message: "Aanvraag niet gevonden." };
  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) {
    if (!isAanvraagStatus(input.status)) return { ok: false as const, message: "Onbekende status." };
    patch.status = input.status;
  }
  if (input.productFit !== undefined) {
    if (input.productFit && !isProductFit(input.productFit)) return { ok: false as const, message: "Onbekende product fit." };
    patch.product_fit = input.productFit || null;
  }
  if (input.qualificationNotes !== undefined) patch.qualification_notes = input.qualificationNotes.trim() || null;
  return saveAanvraagPatch(current, patch, input.actorEmail, AANVRAAG_ACTIVITY.PRODUCT_FIT_SET);
}

export async function saveAanvraagCallNote(input: { id: string; callNotes: string; actorEmail: string }) {
  const current = await loadAanvraag(input.id);
  if (!current) return { ok: false as const, message: "Aanvraag niet gevonden." };
  return saveAanvraagPatch(current, { call_notes: input.callNotes.trim() || null }, input.actorEmail, AANVRAAG_ACTIVITY.CALL_NOTE_SAVED);
}

export async function saveAanvraagNextAction(input: {
  id: string;
  nextAction: string;
  nextActionAt: string;
  actorEmail: string;
}) {
  const current = await loadAanvraag(input.id);
  if (!current) return { ok: false as const, message: "Aanvraag niet gevonden." };
  return saveAanvraagPatch(
    current,
    {
      next_action: input.nextAction.trim() || null,
      next_action_at: input.nextActionAt.trim() || null,
    },
    input.actorEmail,
    AANVRAAG_ACTIVITY.NEXT_ACTION_SET
  );
}

async function saveAanvraagPatch(
  current: AanvraagRecord,
  patch: Record<string, unknown>,
  actorEmail: string,
  eventType: string
) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("inbound_leads").update(patch).eq("id", current.id);
    if (error) return { ok: false as const, message: error.message };
  } else {
    await mutateStore((store) => {
      const row = store.aanvragen.find((item) => item.id === current.id);
      if (!row) {
        store.aanvragen.unshift({ ...current, ...patch } as AanvraagRecord);
        return;
      }
      Object.assign(row, patch);
    });
  }
  await logActivity({
    leadId: current.id,
    eventType: patch.status && patch.status !== current.status ? AANVRAAG_ACTIVITY.STATUS_UPDATED : eventType,
    actorEmail,
    metadata: patch,
  });
  return { ok: true as const };
}

export async function createDraftProposal(input: { leadId: string; actorEmail: string }) {
  const { createProposalFromRequest } = await import("@/lib/commercial-handoffs");
  return createProposalFromRequest(input.leadId, input.actorEmail);
}

export async function createLegacyDraftProposal(input: { leadId: string; actorEmail: string }) {
  const detail = await loadAanvraag(input.leadId);
  if (!detail) return { ok: false as const, message: "Aanvraag niet gevonden." };
  if (detail.proposal?.status === "DRAFT") {
    return { ok: true as const, id: detail.proposal.id, already: true as const };
  }

  const fit = inferredProductFit(detail) ?? "REVIEW_REQUIRED";
  const lines = proposalLinesForFit(fit);
  const title = `Voorstel ${detail.company_name || detail.name}`;
  const notes = [
    detail.company_name ? `Organisatie: ${detail.company_name}` : "",
    `Contact: ${detail.name} · ${detail.email}`,
    detail.website ? `Website: ${detail.website}` : "",
    detail.request_detail || detail.notes || "",
  ]
    .filter(Boolean)
    .join("\n");

  const supabase = refreshClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from("kopvast_proposals")
      .select("id")
      .eq("inbound_lead_id", detail.id)
      .eq("status", "DRAFT")
      .maybeSingle();
    if (existing) return { ok: true as const, id: existing.id as string, already: true as const };

    const { data: created, error } = await supabase
      .from("kopvast_proposals")
      .insert({
        inbound_lead_id: detail.id,
        status: "DRAFT",
        product_fit: fit,
        title,
        notes,
      })
      .select("id")
      .single();
    if (error || !created) {
      const { data: race } = await supabase
        .from("kopvast_proposals")
        .select("id")
        .eq("inbound_lead_id", detail.id)
        .eq("status", "DRAFT")
        .maybeSingle();
      if (race) return { ok: true as const, id: race.id as string, already: true as const };
      console.error("[kopvast] Voorstel aanmaken mislukt", error?.message);
      return { ok: false as const, message: "Voorstel aanmaken is mislukt." };
    }

    if (lines.length) {
      await supabase.from("kopvast_proposal_lines").insert(
        lines.map((line) => ({
          proposal_id: created.id,
          ...line,
        }))
      );
    }
    await logActivity({
      leadId: detail.id,
      eventType: AANVRAAG_ACTIVITY.PROPOSAL_CREATED,
      actorEmail: input.actorEmail,
      metadata: { proposal_id: created.id, product_fit: fit },
    });
    return { ok: true as const, id: created.id as string };
  }

  const created = await mutateStore((store) => {
    const existing = existingDraftProposal(store.aanvraagProposals, detail.id);
    if (existing) return { id: existing.id, already: true as const };
    const id = newId();
    const createdAt = nowIso();
    store.aanvraagProposals.unshift({
      id,
      inbound_lead_id: detail.id,
      status: "DRAFT",
      product_fit: fit,
      title,
      notes,
      created_at: createdAt,
      updated_at: createdAt,
      lines: [],
    });
    for (const line of lines) {
      store.proposalLines.push({ ...line, id: newId(), proposal_id: id });
    }
    const row = store.aanvragen.find((item) => item.id === detail.id);
    if (row) {
      row.proposal_id = id;
      row.proposal_status = "DRAFT";
    }
    return { id, already: false as const };
  });
  if (!created.already) {
    await logActivity({
      leadId: detail.id,
      eventType: AANVRAAG_ACTIVITY.PROPOSAL_CREATED,
      actorEmail: input.actorEmail,
      metadata: { proposal_id: created.id, product_fit: fit },
    });
  }
  return { ok: true as const, id: created.id, already: created.already };
}

export async function loadProposal(id: string): Promise<(ProposalRecord & { aanvraag: AanvraagRecord | null }) | null> {
  const supabase = refreshClient();
  if (!supabase) {
    const store = await readStore();
    const proposal = store.aanvraagProposals.find((item) => item.id === id);
    if (!proposal) return null;
    const lines = store.proposalLines.filter((item) => item.proposal_id === id).sort((a, b) => a.sort_order - b.sort_order);
    const aanvraag = (await localFromFormLeads()).find((item) => item.id === proposal.inbound_lead_id) ?? null;
    return { ...proposal, lines, aanvraag };
  }

  const { data } = await supabase.from("kopvast_proposals").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: lines } = await supabase.from("kopvast_proposal_lines").select("*").eq("proposal_id", id).order("sort_order");
  const leadId = String((data as { inbound_lead_id: string }).inbound_lead_id);
  const { data: lead } = await supabase.from("inbound_leads").select("*").eq("id", leadId).maybeSingle();
  return {
    id,
    inbound_lead_id: leadId,
    status: (data as { status: ProposalStatus }).status,
    product_fit: isProductFit(String((data as { product_fit?: string }).product_fit ?? ""))
      ? ((data as { product_fit: ProductFit }).product_fit)
      : null,
    title: String((data as { title: string }).title),
    notes: asString((data as { notes?: string }).notes) || null,
    created_at: String((data as { created_at: string }).created_at),
    updated_at: String((data as { updated_at: string }).updated_at),
    lines: ((lines ?? []) as Array<Record<string, unknown>>).map((line) => ({
      id: String(line.id),
      proposal_id: id,
      title: String(line.title ?? ""),
      description: asString(line.description),
      amount_label: asString(line.amount_label),
      cadence: asString(line.cadence),
      sort_order: Number(line.sort_order ?? 0),
    })),
    aanvraag: lead ? mapLeadRow(lead as Record<string, unknown>, { id, status: String((data as { status: string }).status) }) : null,
  };
}

export async function saveProposalDraft(input: {
  id: string;
  title: string;
  notes: string;
  lines: Array<{ title: string; description: string; amount_label: string; cadence: string }>;
  actorEmail: string;
}) {
  const proposal = await loadProposal(input.id);
  if (!proposal) return { ok: false as const, message: "Voorstel niet gevonden." };
  if (proposal.status !== "DRAFT") return { ok: false as const, message: "Alleen een concept is nog bewerkbaar." };

  const cleaned = input.lines
    .map((line, index) => ({
      title: line.title.trim() || `Onderdeel ${index + 1}`,
      description: line.description.trim(),
      amount_label: line.amount_label.trim(),
      cadence: line.cadence.trim(),
      sort_order: index,
    }))
    .filter((line) => line.title);

  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_proposals")
      .update({
        title: input.title.trim() || proposal.title,
        notes: input.notes.trim() || null,
        updated_at: nowIso(),
      })
      .eq("id", proposal.id);
    if (error) return { ok: false as const, message: error.message };
    await supabase.from("kopvast_proposal_lines").delete().eq("proposal_id", proposal.id);
    if (cleaned.length) {
      await supabase.from("kopvast_proposal_lines").insert(cleaned.map((line) => ({ ...line, proposal_id: proposal.id })));
    }
  } else {
    await mutateStore((store) => {
      const row = store.aanvraagProposals.find((item) => item.id === proposal.id);
      if (row) {
        row.title = input.title.trim() || row.title;
        row.notes = input.notes.trim() || null;
        row.updated_at = nowIso();
      }
      store.proposalLines = store.proposalLines.filter((item) => item.proposal_id !== proposal.id);
      for (const line of cleaned) {
        store.proposalLines.push({ ...line, id: newId(), proposal_id: proposal.id });
      }
    });
  }

  await logActivity({
    leadId: proposal.inbound_lead_id,
    eventType: AANVRAAG_ACTIVITY.PROPOSAL_UPDATED,
    actorEmail: input.actorEmail,
    metadata: { proposal_id: proposal.id, line_count: cleaned.length },
  });
  return { ok: true as const };
}

export function organizationLabel(row: Pick<AanvraagRecord, "company_name" | "name">) {
  return row.company_name?.trim() || row.name;
}

export function websiteLabel(row: Pick<AanvraagRecord, "website">) {
  return domainFromWebsite(row.website) || row.website || "—";
}
