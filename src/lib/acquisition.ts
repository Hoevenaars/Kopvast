import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { sanitizeAcquisitionSearch } from "./mail-body";
import { refreshClient } from "./refresh";
import { clickActivityLabel, loadRecentAcquisitionClicks } from "./acquisition-clicks";
import { scoutProspectIds } from "./scout/crm";
import { assertPublicHostname } from "./ssrf";
import { parseManualEmail } from "./contact-email";
import { isEmail, normalizeEmail } from "./product";
import { canonicalDomainFromInput } from "./acquire-score";
import { addSuppression, findSuppression, type SuppressionHit } from "./suppression";
import { logProspectActivity } from "./acquisition-activity";
import {
  MAX_IMPORT_PROSPECTS,
  parseProspectImportText,
  type ParsedImportRow,
} from "./acquisition-import";
import {
  ACTIVITY,
  emptyScanProgress,
  isAcquisitionFilter,
  isAcquisitionSort,
  SCANNER_VERSION,
  type AcquisitionFilter,
  type AcquisitionSort,
  type ContactStatus,
  type MailStatus,
  type ProductFit,
  type ProspectStatus,
  type ResponseStatus,
  type ScanProgressStep,
} from "./acquisition-constants";

export class AcquisitionConfigError extends Error {
  constructor() {
    super("Website Refresh is niet geconfigureerd.");
    this.name = "AcquisitionConfigError";
  }
}

export function requireRefresh(): SupabaseClient {
  const supabase = refreshClient();
  if (!supabase) throw new AcquisitionConfigError();
  return supabase;
}

export type ProspectListItem = {
  id: string;
  company_name: string | null;
  domain: string;
  website_url: string;
  status: ProspectStatus;
  opportunity_score: number | null;
  product_fit: ProductFit | null;
  mail_status: MailStatus;
  response_status: ResponseStatus | null;
  last_activity_at: string | null;
  created_at: string;
  email: string | null;
  suppressed: boolean;
  fromScout: boolean;
};

export type ProspectContact = {
  id: string;
  prospect_id: string;
  email: string;
  email_source: string;
  email_verification_status: string;
  contact_status: ContactStatus;
  consent_source: string | null;
  consent_timestamp: string | null;
  do_not_contact: boolean;
  legal_note: string | null;
};

export type ProspectFinding = {
  id: string;
  scan_id?: string | null;
  finding_type: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  evidence_reference: string | null;
  evidence_type: string | null;
};

export type ProspectMail = {
  id: string;
  prospect_id: string | null;
  contact_id: string | null;
  scan_id: string | null;
  analysis_id: string | null;
  subject: string | null;
  body_text: string | null;
  status: string;
  kind: string;
  email_mode: string | null;
  intended_to_email: string | null;
  to_email: string;
  provider_message_id: string | null;
  template_version: string | null;
  prompt_version: string | null;
  findings_used: unknown;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
};

export type ProspectScan = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  website_url: string | null;
  canonical_domain: string | null;
  progress: ScanProgressStep[];
  error_message: string | null;
  scanner_version: string;
};

export type ProspectDetail = {
  id: string;
  company_name: string | null;
  domain: string;
  website_url: string;
  city: string | null;
  status: ProspectStatus;
  opportunity_score: number | null;
  website_improvement_potential: number | null;
  commercial_fit_score: number | null;
  product_fit_score: number | null;
  product_fit: ProductFit | null;
  contact_status: ContactStatus;
  mail_status: MailStatus;
  response_status: ResponseStatus | null;
  next_action: string | null;
  next_action_at: string | null;
  do_not_contact: boolean;
  auto_outreach_blocked: boolean;
  legal_note: string | null;
  notes: string | null;
  last_scan_at: string | null;
  last_contacted_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  inbound_lead_id: string | null;
  public_check_token: string | null;
  scan_cost: number;
  ai_cost: number;
  email_cost: number;
  total_cost: number;
  contact: ProspectContact | null;
  contacts: ProspectContact[];
  scan: ProspectScan | null;
  findings: ProspectFinding[];
  mail: ProspectMail | null;
  mails: ProspectMail[];
  activities: Array<{ id: string; event_type: string; actor_type: string; created_at: string; metadata: unknown }>;
  suppression: SuppressionHit | null;
  scoreBreakdown: {
    websiteImprovement: number | null;
    commercialFit: number | null;
    productFit: number | null;
    evidenceQuality: number | null;
  };
};

export type DuplicateProspect = {
  id: string;
  company_name: string | null;
  domain: string;
  status: string;
  opportunity_score: number | null;
  last_scan_at: string | null;
  last_contacted_at: string | null;
  response_status: string | null;
  mail_status: string | null;
  email: string | null;
};

export type CreateProspectResult =
  | { ok: true; prospectId: string; scanId: string; reused: boolean }
  | { ok: false; message: string }
  | { ok: false; duplicate: true; existing: DuplicateProspect; suppressed?: SuppressionHit | null }
  | { ok: false; emailConflict: true; existing: DuplicateProspect };

export type UpdateContactEmailResult =
  | { ok: true; email: string }
  | { ok: false; message: string }
  | { ok: false; emailConflict: true; existing: DuplicateProspect };

export type ImportProspectItemResult = {
  website: string;
  email: string | null;
  company: string | null;
} & (
  | { ok: true; prospectId: string; scanId: string }
  | { ok: false; reason: "duplicate" | "email_conflict" | "invalid" | "error"; message: string; existingId?: string }
);

export type ImportProspectsResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      failed: number;
      items: ImportProspectItemResult[];
      parseErrors: Array<{ line: string; message: string }>;
    }
  | { ok: false; message: string };

function asFilter(value: string | undefined): AcquisitionFilter {
  return value && isAcquisitionFilter(value) ? value : "alles";
}

function asSort(value: string | undefined): AcquisitionSort {
  return value && isAcquisitionSort(value) ? value : "activiteit";
}

export async function listAcquisitionProspects(input: {
  filter?: string;
  q?: string;
  sort?: string;
}): Promise<{ items: ProspectListItem[]; configured: boolean; error?: string }> {
  const supabase = refreshClient();
  if (!supabase) return { items: [], configured: false };

  const filter = asFilter(input.filter);
  const sort = asSort(input.sort);
  const needle = sanitizeAcquisitionSearch(input.q ?? "");

  let emailIds: string[] = [];
  if (needle) {
    const { data: emailHits } = await supabase
      .from("prospect_contacts")
      .select("prospect_id")
      .ilike("email", `%${needle}%`)
      .limit(80);
    emailIds = [...new Set((emailHits ?? []).map((row) => row.prospect_id).filter(Boolean))];
  }

  let query = supabase
    .from("prospects")
    .select(
      "id, company_name, domain, website_url, status, opportunity_score, product_fit, mail_status, response_status, last_activity_at, created_at, do_not_contact"
    )
    .eq("is_archived", false);

  if (filter === "nieuw") query = query.in("status", ["NEW", "VALIDATING", "SCANNING", "ANALYSING"]);
  if (filter === "scout") {
    const ids = await scoutProspectIds();
    if (!ids.length) return { items: [], configured: true };
    query = query.in("id", ids);
  }
  if (filter === "scan") query = query.in("status", ["QUALIFIED", "WATCHLIST", "SALES_READY", "PRIORITY"]);
  if (filter === "sales") query = query.in("status", ["SALES_READY", "PRIORITY"]);
  if (filter === "concept") query = query.eq("mail_status", "draft");
  if (filter === "verzonden") query = query.in("mail_status", ["queued", "sent", "delivered"]);
  if (filter === "reactie") query = query.in("response_status", ["POSITIVE", "QUESTION", "MEETING"]);
  if (filter === "geconverteerd") query = query.eq("status", "CONVERTED");
  if (filter === "geblokkeerd") {
    query = query.or("do_not_contact.eq.true,contact_status.in.(DO_NOT_CONTACT,BLOCKED)");
  }
  if (needle) {
    const clauses = [`company_name.ilike.%${needle}%`, `domain.ilike.%${needle}%`];
    if (emailIds.length) clauses.push(`id.in.(${emailIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  if (sort === "score") query = query.order("opportunity_score", { ascending: false, nullsFirst: false });
  else if (sort === "nieuwste") query = query.order("created_at", { ascending: false });
  else if (sort === "status") query = query.order("status", { ascending: true });
  else query = query.order("last_activity_at", { ascending: false, nullsFirst: false });

  const { data, error } = await query.limit(200);
  if (error) {
    console.error("[kopvast] Prospects laden mislukt", error.message);
    return { items: [], configured: true, error: error.message };
  }

  const rows = (data ?? []) as Array<ProspectListItem & { do_not_contact?: boolean }>;
  const ids = rows.map((item) => item.id);
  const scoutIds = new Set(await scoutProspectIds());
  const { data: contacts } = ids.length
    ? await supabase.from("prospect_contacts").select("prospect_id, email, do_not_contact").in("prospect_id", ids)
    : { data: [] as Array<{ prospect_id: string; email: string; do_not_contact: boolean }> };

  const emailByProspect = new Map<string, string>();
  for (const contact of contacts ?? []) {
    if (!emailByProspect.has(contact.prospect_id)) emailByProspect.set(contact.prospect_id, contact.email);
  }

  const items: ProspectListItem[] = rows.map((row) => ({
    ...row,
    email: emailByProspect.get(row.id) ?? null,
    suppressed: Boolean(row.do_not_contact),
    fromScout: scoutIds.has(row.id),
  }));

  return { items, configured: true };
}

async function loadDuplicate(supabase: SupabaseClient, prospectId: string): Promise<DuplicateProspect> {
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, company_name, domain, status, opportunity_score, last_scan_at, last_contacted_at, response_status, mail_status")
    .eq("id", prospectId)
    .single();
  const { data: contact } = await supabase
    .from("prospect_contacts")
    .select("email")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    ...(prospect as DuplicateProspect),
    email: contact?.email ?? null,
  };
}

export async function createAcquisitionProspect(input: {
  website: string;
  email?: string;
  company?: string;
  notes?: string;
  actorEmail: string;
  skipRateLimit?: boolean;
  sourceReference?: string;
  sourceName?: string;
  contactSource?: string;
}): Promise<CreateProspectResult> {
  const supabase = refreshClient();
  if (!supabase) return { ok: false, message: "Website Refresh is niet geconfigureerd." };

  const email = input.email?.trim() ? normalizeEmail(input.email) : "";
  if (input.email?.trim() && !isEmail(email)) return { ok: false, message: "Vul een geldig e-mailadres in." };

  let parsed: ReturnType<typeof canonicalDomainFromInput>;
  try {
    parsed = canonicalDomainFromInput(input.website);
    await assertPublicHostname(parsed.url.hostname);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Dit websiteadres is niet geldig." };
  }

  if (!input.skipRateLimit) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_type", ACTIVITY.SCAN_STARTED)
      .eq("actor_id", input.actorEmail)
      .gte("created_at", since);
    if ((count ?? 0) >= 8) {
      return { ok: false, message: "Te veel scans achter elkaar. Wacht even en probeer opnieuw." };
    }
  }

  const suppression = await findSuppression(supabase, { email: email || undefined, domain: parsed.domain });

  const { data: existing } = await supabase
    .from("prospects")
    .select("id")
    .eq("is_archived", false)
    .ilike("domain", parsed.domain)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: false,
      duplicate: true,
      existing: await loadDuplicate(supabase, existing.id),
      suppressed: suppression,
    };
  }

  if (email) {
    const { data: emailOwner } = await supabase
      .from("prospect_contacts")
      .select("prospect_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (emailOwner?.prospect_id) {
      return { ok: false, emailConflict: true, existing: await loadDuplicate(supabase, emailOwner.prospect_id) };
    }
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const contactSource = input.contactSource || "admin";
  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      company_name: input.company?.trim() || null,
      domain: parsed.domain,
      website_url: parsed.websiteUrl,
      source_type: "kopvast",
      source_reference: input.sourceReference || "kopvast_admin",
      status: "SCANNING",
      notes: input.notes?.trim() || null,
      contact_status: suppression ? "BLOCKED" : "UNKNOWN",
      contact_source: contactSource,
      do_not_contact: Boolean(suppression),
      legal_note: suppression ? `Suppression: ${suppression.reason}` : null,
      public_check_token: token,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[kopvast] Prospect aanmaken mislukt", error?.message);
    return { ok: false, message: "Prospect opslaan is mislukt." };
  }

  const contact = email
    ? await upsertContact(supabase, {
        prospectId: created.id,
        email,
        source: contactSource,
        doNotContact: Boolean(suppression),
        status: suppression ? "BLOCKED" : "UNKNOWN",
      })
    : null;

  const { data: scan, error: scanError } = await supabase
    .from("website_scans")
    .insert({
      prospect_id: created.id,
      status: "queued",
      website_url: parsed.websiteUrl,
      canonical_domain: parsed.domain,
      scanner_version: SCANNER_VERSION,
      progress: emptyScanProgress(),
    })
    .select("id")
    .single();
  if (scanError || !scan) {
    console.error("[kopvast] Scanrecord aanmaken mislukt", scanError?.message);
    return { ok: false, message: "Scan starten is mislukt." };
  }

  await supabase.from("prospect_sources").insert({
    prospect_id: created.id,
    source_type: "kopvast",
    source_url: parsed.websiteUrl,
    source_name: input.sourceName || "Kopvast admin",
    notes: contact?.email || email || input.notes || null,
  });

  await logProspectActivity(supabase, {
    prospectId: created.id,
    eventType: ACTIVITY.PROSPECT_CREATED,
    actorType: "human",
    actorId: input.actorEmail,
    newStatus: "SCANNING",
    metadata: { domain: parsed.domain, email: email || null, suppressed: Boolean(suppression) },
  });
  await logProspectActivity(supabase, {
    prospectId: created.id,
    eventType: ACTIVITY.SCAN_STARTED,
    actorType: "human",
    actorId: input.actorEmail,
    newStatus: "SCANNING",
    metadata: { scanId: scan.id },
  });

  return { ok: true, prospectId: created.id, scanId: scan.id, reused: false };
}

export async function importAcquisitionProspects(input: {
  text: string;
  actorEmail: string;
  rows?: ParsedImportRow[];
}): Promise<ImportProspectsResult> {
  const parsed = input.rows ? { rows: input.rows, errors: [] } : parseProspectImportText(input.text);
  if (!parsed.rows.length && !parsed.errors.length) {
    return { ok: false, message: "Plak minstens één website met e-mailadres." };
  }
  if (parsed.rows.length > MAX_IMPORT_PROSPECTS) {
    return { ok: false, message: `Een lijst mag maximaal ${MAX_IMPORT_PROSPECTS} websites bevatten.` };
  }

  const items: ImportProspectItemResult[] = [];
  for (const row of parsed.rows) {
    const result = await createAcquisitionProspect({
      website: row.website,
      email: row.email ?? "",
      company: row.company ?? "",
      notes: row.notes ?? "",
      actorEmail: input.actorEmail,
      skipRateLimit: true,
      sourceReference: "kopvast_import",
      sourceName: "Kopvast import",
      contactSource: "import",
    });
    if (result.ok) {
      items.push({
        ok: true,
        website: row.website,
        email: row.email,
        company: row.company,
        prospectId: result.prospectId,
        scanId: result.scanId,
      });
      continue;
    }
    if ("duplicate" in result && result.duplicate) {
      items.push({
        ok: false,
        reason: "duplicate",
        website: row.website,
        email: row.email,
        company: row.company,
        message: `${result.existing.domain} staat al in Kopvast.`,
        existingId: result.existing.id,
      });
      continue;
    }
    if ("emailConflict" in result && result.emailConflict) {
      items.push({
        ok: false,
        reason: "email_conflict",
        website: row.website,
        email: row.email,
        company: row.company,
        message: `${row.email} hoort al bij ${result.existing.domain}.`,
        existingId: result.existing.id,
      });
      continue;
    }
    items.push({
      ok: false,
      reason: "error",
      website: row.website,
      email: row.email,
      company: row.company,
      message: "message" in result ? result.message : "Prospect opslaan is mislukt.",
    });
  }

  return {
    ok: true,
    created: items.filter((item) => item.ok).length,
    skipped: items.filter((item) => !item.ok && (item.reason === "duplicate" || item.reason === "email_conflict")).length,
    failed: items.filter((item) => !item.ok && item.reason !== "duplicate" && item.reason !== "email_conflict").length,
    items,
    parseErrors: parsed.errors,
  };
}

export async function reuseProspectScan(input: {
  prospectId: string;
  email?: string;
  company?: string;
  notes?: string;
  website?: string;
  actorEmail: string;
}): Promise<CreateProspectResult> {
  const supabase = refreshClient();
  if (!supabase) return { ok: false, message: "Website Refresh is niet geconfigureerd." };

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, domain, website_url, company_name, notes, status")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!prospect) return { ok: false, message: "Deze prospect bestaat niet meer." };

  let websiteUrl = prospect.website_url as string;
  if (input.website?.trim()) {
    try {
      websiteUrl = canonicalDomainFromInput(input.website).websiteUrl;
    } catch {
      websiteUrl = prospect.website_url as string;
    }
  }

  if (input.email) {
    const email = normalizeEmail(input.email);
    if (!isEmail(email)) return { ok: false, message: "Vul een geldig e-mailadres in." };
    const { data: emailOwner } = await supabase
      .from("prospect_contacts")
      .select("prospect_id")
      .ilike("email", email)
      .neq("prospect_id", prospect.id)
      .limit(1)
      .maybeSingle();
    if (emailOwner?.prospect_id) {
      return { ok: false, emailConflict: true, existing: await loadDuplicate(supabase, emailOwner.prospect_id) };
    }
    const suppression = await findSuppression(supabase, { email, domain: prospect.domain });
    await upsertContact(supabase, {
      prospectId: prospect.id,
      email,
      source: "admin",
      doNotContact: Boolean(suppression),
      status: suppression ? "BLOCKED" : "UNKNOWN",
    });
    if (suppression) {
      await supabase
        .from("prospects")
        .update({
          do_not_contact: true,
          contact_status: "BLOCKED",
          legal_note: `Suppression: ${suppression.reason}`,
        })
        .eq("id", prospect.id);
    }
  }

  const patch: Record<string, unknown> = {
    status: "SCANNING",
    website_url: websiteUrl,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.company?.trim()) patch.company_name = input.company.trim();
  if (input.notes?.trim()) patch.notes = [prospect.notes, input.notes.trim()].filter(Boolean).join("\n\n");
  await supabase.from("prospects").update(patch).eq("id", prospect.id);

  const { data: scan, error: scanError } = await supabase
    .from("website_scans")
    .insert({
      prospect_id: prospect.id,
      status: "queued",
      website_url: websiteUrl,
      canonical_domain: prospect.domain,
      scanner_version: SCANNER_VERSION,
      progress: emptyScanProgress(),
    })
    .select("id")
    .single();
  if (scanError || !scan) return { ok: false, message: "Nieuwe scan starten is mislukt." };

  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.PROSPECT_REUSED,
    actorType: "human",
    actorId: input.actorEmail,
    oldStatus: prospect.status,
    newStatus: "SCANNING",
  });
  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.SCAN_STARTED,
    actorType: "human",
    actorId: input.actorEmail,
    newStatus: "SCANNING",
    metadata: { scanId: scan.id },
  });

  return { ok: true, prospectId: prospect.id, scanId: scan.id, reused: true };
}

export async function upsertContact(
  supabase: SupabaseClient,
  input: {
    prospectId: string;
    email: string;
    source: string;
    doNotContact?: boolean;
    status?: ContactStatus;
  }
) {
  const email = normalizeEmail(input.email);
  const { data: existing } = await supabase
    .from("prospect_contacts")
    .select("*")
    .eq("prospect_id", input.prospectId)
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    const { data } = await supabase
      .from("prospect_contacts")
      .update({
        do_not_contact: input.doNotContact ?? existing.do_not_contact,
        contact_status: input.status ?? existing.contact_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    return data as ProspectContact | null;
  }
  const { data } = await supabase
    .from("prospect_contacts")
    .insert({
      prospect_id: input.prospectId,
      email,
      email_source: input.source,
      do_not_contact: Boolean(input.doNotContact),
      contact_status: input.status ?? "UNKNOWN",
    })
    .select("*")
    .single();
  return data as ProspectContact | null;
}

export async function updateProspectContactEmail(input: {
  prospectId: string;
  email: string;
  actorEmail: string;
  source?: string;
}): Promise<UpdateContactEmailResult> {
  const parsed = parseManualEmail(input.email);
  if (!parsed.ok) return parsed;
  const email = parsed.email;

  const supabase = refreshClient();
  if (!supabase) return { ok: false, message: "Website Refresh is niet geconfigureerd." };

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, domain, do_not_contact, contact_status")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!prospect) return { ok: false, message: "Prospect niet gevonden." };

  const { data: emailOwner } = await supabase
    .from("prospect_contacts")
    .select("prospect_id")
    .ilike("email", email)
    .neq("prospect_id", prospect.id)
    .limit(1)
    .maybeSingle();
  if (emailOwner?.prospect_id) {
    return { ok: false, emailConflict: true, existing: await loadDuplicate(supabase, emailOwner.prospect_id) };
  }

  const suppression = await findSuppression(supabase, { email, domain: prospect.domain });
  const contact = await upsertContact(supabase, {
    prospectId: prospect.id,
    email,
    source: input.source ?? "admin",
    doNotContact: Boolean(suppression) || Boolean(prospect.do_not_contact),
    status: suppression ? "BLOCKED" : prospect.contact_status === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
  });

  const patch: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (suppression) {
    patch.do_not_contact = true;
    patch.contact_status = "BLOCKED";
    patch.legal_note = `Suppression: ${suppression.reason}`;
  }
  await supabase.from("prospects").update(patch).eq("id", prospect.id);

  if (contact) {
    await supabase
      .from("email_messages")
      .update({
        intended_to_email: email,
        to_email: email,
        contact_id: contact.id,
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospect.id)
      .eq("kind", "acquisition_outreach")
      .eq("status", "draft");
  }

  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.CONTACT_UPDATED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { email, source: input.source ?? "admin", suppressed: Boolean(suppression) },
  });

  const { syncScoutEmailFromProspect } = await import("./scout/crm");
  await syncScoutEmailFromProspect(prospect.id, email);

  return { ok: true, email };
}

export const loadProspectDetail = cache(async (id: string): Promise<ProspectDetail | null> => {
  const supabase = refreshClient();
  if (!supabase) return null;

  const { data: prospect } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle();
  if (!prospect) return null;

  const [scansRes, findingsRes, mailsRes, scoresRes, activitiesRes, contactPack] = await Promise.all([
    supabase.from("website_scans").select("*").eq("prospect_id", id).order("started_at", { ascending: false }).limit(5),
    supabase.from("findings").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(40),
    supabase
      .from("email_messages")
      .select("*")
      .eq("prospect_id", id)
      .in("kind", ["acquisition_outreach", "acquisition_test"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("prospect_scores").select("*").eq("prospect_id", id).order("calculated_at", { ascending: false }).limit(1),
    supabase.from("activity_logs").select("id, event_type, actor_type, created_at, metadata").eq("prospect_id", id).order("created_at", { ascending: false }).limit(30),
    supabase
      .from("prospect_contacts")
      .select("*")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .then(async (contactsRes) => {
        const contacts = (contactsRes.data ?? []) as ProspectContact[];
        const suppression = await findSuppression(supabase, { email: contacts[0]?.email, domain: prospect.domain });
        return { contacts, suppression };
      }),
  ]);

  const contacts = contactPack.contacts;
  const suppression = contactPack.suppression;
  const scans = (scansRes.data ?? []) as ProspectScan[];
  const mails = (mailsRes.data ?? []).map((row) => ({
    ...row,
    provider_message_id: (row as { resend_id?: string }).resend_id ?? null,
  })) as ProspectMail[];
  const score = (scoresRes.data ?? [])[0] as
    | {
        website_improvement_potential?: number;
        commercial_fit_score?: number;
        product_fit_score?: number;
        evidence_quality_score?: number;
      }
    | undefined;
  const contact = contacts[0] ?? null;

  return {
    id: prospect.id,
    company_name: prospect.company_name,
    domain: prospect.domain,
    website_url: prospect.website_url,
    city: typeof prospect.city === "string" && prospect.city.trim() ? prospect.city.trim() : null,
    status: prospect.status,
    opportunity_score: prospect.opportunity_score == null ? null : Number(prospect.opportunity_score),
    website_improvement_potential: score?.website_improvement_potential == null ? null : Number(score.website_improvement_potential),
    commercial_fit_score: prospect.commercial_fit_score == null ? null : Number(prospect.commercial_fit_score),
    product_fit_score: prospect.product_fit_score == null ? null : Number(prospect.product_fit_score),
    product_fit: prospect.product_fit,
    contact_status: prospect.contact_status,
    mail_status: prospect.mail_status,
    response_status: prospect.response_status,
    next_action: prospect.next_action,
    next_action_at: prospect.next_action_at,
    do_not_contact: prospect.do_not_contact,
    auto_outreach_blocked: prospect.auto_outreach_blocked,
    legal_note: prospect.legal_note,
    notes: prospect.notes,
    last_scan_at: prospect.last_scan_at,
    last_contacted_at: prospect.last_contacted_at,
    last_activity_at: prospect.last_activity_at,
    created_at: prospect.created_at,
    inbound_lead_id: prospect.inbound_lead_id,
    public_check_token: prospect.public_check_token,
    scan_cost: Number(prospect.scan_cost ?? 0),
    ai_cost: Number(prospect.ai_cost ?? 0),
    email_cost: Number(prospect.email_cost ?? 0),
    total_cost: Number(prospect.total_cost ?? 0),
    contact,
    contacts,
    scan: scans[0]
      ? {
          ...scans[0],
          progress: Array.isArray(scans[0].progress) ? (scans[0].progress as ScanProgressStep[]) : emptyScanProgress(),
        }
      : null,
    findings: (() => {
      const all = (findingsRes.data ?? []) as ProspectFinding[];
      const scanId = scans[0]?.id;
      if (!scanId) return all;
      const scoped = all.filter((item) => item.scan_id === scanId);
      return scoped.length ? scoped : all;
    })(),
    mail:
      mails.find((item) => item.kind === "acquisition_outreach" && item.status !== "cancelled") ??
      mails.find((item) => item.kind === "acquisition_outreach") ??
      mails[0] ??
      null,
    mails,
    activities: (activitiesRes.data ?? []) as ProspectDetail["activities"],
    suppression,
    scoreBreakdown: {
      websiteImprovement: score?.website_improvement_potential == null ? null : Number(score.website_improvement_potential),
      commercialFit: score?.commercial_fit_score == null ? null : Number(score.commercial_fit_score),
      productFit: score?.product_fit_score == null ? null : Number(score.product_fit_score),
      evidenceQuality: score?.evidence_quality_score == null ? null : Number(score.evidence_quality_score),
    },
  };
});

export async function updateProspectFollowUp(input: {
  prospectId: string;
  responseStatus?: string;
  nextAction?: string;
  nextActionAt?: string;
  actorEmail: string;
}) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };

  const { data: prospect } = await supabase.from("prospects").select("*").eq("id", input.prospectId).maybeSingle();
  if (!prospect) return { ok: false as const, message: "Prospect niet gevonden." };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() };
  if (input.responseStatus) {
    patch.response_status = input.responseStatus;
    if (input.responseStatus === "UNSUBSCRIBED") {
      patch.do_not_contact = true;
      patch.contact_status = "DO_NOT_CONTACT";
      patch.auto_outreach_blocked = true;
    }
    if (input.responseStatus === "NOT_INTERESTED") {
      patch.auto_outreach_blocked = true;
    }
  }
  if (input.nextAction !== undefined) patch.next_action = input.nextAction.trim() || null;
  if (input.nextActionAt !== undefined) patch.next_action_at = input.nextActionAt || null;

  const { error } = await supabase.from("prospects").update(patch).eq("id", input.prospectId);
  if (error) return { ok: false as const, message: error.message };

  if (input.responseStatus === "UNSUBSCRIBED") {
    const { data: contact } = await supabase
      .from("prospect_contacts")
      .select("email")
      .eq("prospect_id", input.prospectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contact?.email) {
      await supabase
        .from("prospect_contacts")
        .update({ do_not_contact: true, contact_status: "DO_NOT_CONTACT", updated_at: new Date().toISOString() })
        .eq("prospect_id", input.prospectId);
      await addSuppression(supabase, {
        email: contact.email,
        reason: "UNSUBSCRIBED",
        source: "admin",
      });
    }
    await logProspectActivity(supabase, {
      prospectId: input.prospectId,
      eventType: ACTIVITY.PROSPECT_BLOCKED,
      actorType: "human",
      actorId: input.actorEmail,
      metadata: { reason: "UNSUBSCRIBED" },
    });
  }

  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: input.responseStatus ? ACTIVITY.RESPONSE_UPDATED : ACTIVITY.NEXT_ACTION_SET,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: {
      response_status: input.responseStatus ?? null,
      next_action: input.nextAction ?? null,
    },
  });

  return { ok: true as const };
}

export async function convertProspectToLead(input: { prospectId: string; actorEmail: string }) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };

  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  if (detail.inbound_lead_id) return { ok: true as const, leadId: detail.inbound_lead_id, already: true };

  const email = detail.contact?.email;
  if (!email) return { ok: false as const, message: "Er is geen e-mailadres gekoppeld." };

  const { data: created, error } = await supabase
    .from("inbound_leads")
    .insert({
      type: detail.product_fit === "CUSTOM_FIT" ? "maatwerk" : "website",
      product_fit: detail.product_fit,
      status: "NIEUW",
      company_name: detail.company_name,
      website: detail.website_url,
      name: detail.company_name || detail.domain,
      email,
      notes: detail.notes,
      consent: detail.contact_status === "CONSENTED",
      source: "kopvast-acquisitie",
      prospect_id: detail.id,
      payload: {
        source: "acquisitie",
        prospect_id: detail.id,
        scan_id: detail.scan?.id ?? null,
        product_fit: detail.product_fit,
        opportunity_score: detail.opportunity_score,
      },
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[kopvast] Lead vanuit prospect mislukt", error?.message);
    return { ok: false as const, message: "Lead aanmaken is mislukt." };
  }

  await supabase
    .from("prospects")
    .update({
      status: "CONVERTED",
      inbound_lead_id: created.id,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", detail.id);

  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: ACTIVITY.PROSPECT_CONVERTED,
    actorType: "human",
    actorId: input.actorEmail,
    oldStatus: detail.status,
    newStatus: "CONVERTED",
    metadata: { leadId: created.id },
  });

  return { ok: true as const, leadId: created.id as string };
}

export type DashboardAction = {
  title: string;
  company: string;
  status: string;
  age: string;
  href: string;
};

function ageLabel(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.round(diff / 3_600_000));
  if (hours < 24) return `${hours}u`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export async function loadAcquisitionDashboard() {
  const supabase = refreshClient();
  const empty = {
    configured: false,
    metrics: {
      prospects: 0,
      scans: 0,
      salesReady: 0,
      drafts: 0,
      sent: 0,
      responses: 0,
      errors: 0,
    },
    actions: [] as DashboardAction[],
    pipeline: {
      nieuw: 0,
      qualified: 0,
      salesReady: 0,
      verzonden: 0,
      response: 0,
    },
  };
  if (!supabase) return empty;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.toISOString();

  const [
    newProspects,
    scansToday,
    salesReadyToday,
    drafts,
    sentToday,
    responsesToday,
    failedScans,
    reviewRequired,
    customFit,
    bounced,
    failedMail,
    responsesOpen,
    overdue,
    blocked,
  ] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).gte("created_at", today).eq("is_archived", false),
    supabase.from("website_scans").select("id", { count: "exact", head: true }).gte("started_at", today),
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("status", ["SALES_READY", "PRIORITY"]).gte("updated_at", today),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("mail_status", "draft").eq("is_archived", false),
    supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("kind", "acquisition_outreach").in("status", ["sent", "delivered"]).gte("created_at", today),
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("response_status", ["POSITIVE", "QUESTION", "MEETING"]).gte("updated_at", today),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("status", "SCAN_FAILED").eq("is_archived", false).limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("product_fit", "REVIEW_REQUIRED").eq("is_archived", false).limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("product_fit", "CUSTOM_FIT").neq("status", "CONVERTED").eq("is_archived", false).limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("mail_status", "bounced").eq("is_archived", false).limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("mail_status", "failed").eq("is_archived", false).limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").in("response_status", ["POSITIVE", "QUESTION", "MEETING"]).eq("is_archived", false).limit(8),
    supabase
      .from("prospects")
      .select("id, company_name, domain, updated_at, last_activity_at, next_action")
      .not("next_action_at", "is", null)
      .lt("next_action_at", new Date().toISOString())
      .eq("is_archived", false)
      .limit(8),
    supabase.from("prospects").select("id, company_name, domain, updated_at, last_activity_at").eq("do_not_contact", true).eq("is_archived", false).neq("status", "CONVERTED").limit(8),
  ]);

  const pipeline = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("status", ["NEW", "SCANNING", "ANALYSING"]).eq("is_archived", false),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("status", "QUALIFIED").eq("is_archived", false),
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("status", ["SALES_READY", "PRIORITY"]).eq("is_archived", false),
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("mail_status", ["queued", "sent", "delivered"]).eq("is_archived", false),
    supabase.from("prospects").select("id", { count: "exact", head: true }).in("response_status", ["POSITIVE", "QUESTION", "MEETING"]).eq("is_archived", false),
  ]);

  const actions: DashboardAction[] = [];
  const push = (
    rows: Array<{ id: string; company_name: string | null; domain: string; updated_at?: string; last_activity_at?: string }> | null,
    title: string,
    status: string
  ) => {
    for (const row of rows ?? []) {
      actions.push({
        title,
        company: row.company_name || row.domain,
        status,
        age: ageLabel(row.last_activity_at || row.updated_at || null),
        href: `/admin/acquisitie/${row.id}`,
      });
    }
  };
  const clicks = await loadRecentAcquisitionClicks(8);
  for (const click of clicks) {
    actions.unshift({
      title: clickActivityLabel(click.choice),
      company: click.company,
      status: "Opvolgen",
      age: ageLabel(click.clickedAt),
      href: `/admin/acquisitie/${click.prospectId}`,
    });
  }
  push(failedScans.data as never, "Website scan mislukt", "Actie nodig");
  push(reviewRequired.data as never, "Review required", "Beoordelen");
  push(customFit.data as never, "Maatwerk prospect", "Beoordelen");
  push(bounced.data as never, "Mail bounced", "Actie nodig");
  push(failedMail.data as never, "Mail mislukt", "Actie nodig");
  push(responsesOpen.data as never, "Reactie ontvangen", "Opvolgen");
  push(overdue.data as never, "Next action verlopen", "Actie nodig");
  push(blocked.data as never, "Contactstatus blokkeert verzending", "Geblokkeerd");

  return {
    configured: true,
    metrics: {
      prospects: newProspects.count ?? 0,
      scans: scansToday.count ?? 0,
      salesReady: salesReadyToday.count ?? 0,
      drafts: drafts.count ?? 0,
      sent: sentToday.count ?? 0,
      responses: responsesToday.count ?? 0,
      errors: (failedScans.data?.length ?? 0) + (failedMail.data?.length ?? 0),
    },
    actions: actions.slice(0, 12),
    pipeline: {
      nieuw: pipeline[0].count ?? 0,
      qualified: pipeline[1].count ?? 0,
      salesReady: pipeline[2].count ?? 0,
      verzonden: pipeline[3].count ?? 0,
      response: pipeline[4].count ?? 0,
    },
  };
}
