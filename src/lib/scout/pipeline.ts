import { pickLeadEmail, withManualEmailEnrichment } from "@/lib/contact-email";
import { pickStoredCompanyName } from "@/lib/company-name";
import { normalizeEmail } from "@/lib/product";
import { prospectIdentityKey } from "@/lib/acquisition";
import { greetingForContact, knownFirstName, prospectIdentityForProfile } from "@/lib/prospect-profile";
import { findSuppression } from "@/lib/suppression";
import { buildPersonalApproachLetter } from "@/lib/acquisition/outreach-policy";
import { newId, nowIso } from "@/lib/workspace-store";
import { allowExpensiveSideEffects } from "./config";
import { analyseScoutLead } from "./ai";
import { scoutServiceClient } from "./auth";
import { enrichFromFacts } from "./enrichment";
import { enqueuePipelineJob, failJob, claimPendingJobs, completeJob } from "./jobs";
import { appendEvent, getLeadById, insertScan, scoutLeadHasWebsite, updateLead, upsertDraft } from "./leads";
import { scanPublicWebsite } from "./scanner";
import { syncProspectFromScout } from "./crm";
import type { ScoutEnrichment, ScoutLead } from "./types";

export { enqueuePipelineJob };

async function linkProspect(leadId: string, domain: string, websiteUrl: string, note: string | null, source: string) {
  const supabase = scoutServiceClient();
  if (!supabase || !domain.trim()) return null;
  const current = await getLeadById(leadId);
  if (current?.prospect_id) {
    await supabase
      .from("prospects")
      .update({
        domain,
        website_url: websiteUrl,
        status: "SCANNING",
        updated_at: nowIso(),
        last_activity_at: nowIso(),
      })
      .eq("id", current.prospect_id);
    await supabase.from("prospect_sources").insert({
      prospect_id: current.prospect_id,
      source_type: "kopvast",
      source_url: websiteUrl,
      source_name: `Kopvast Scout (${source})`,
      notes: note,
    });
    return current.prospect_id;
  }
  const { data: existing } = await supabase
    .from("prospects")
    .select("id")
    .eq("is_archived", false)
    .ilike("domain", domain)
    .maybeSingle();
  if (existing?.id) {
    await updateLead(leadId, { prospect_id: existing.id });
    await supabase.from("prospect_sources").insert({
      prospect_id: existing.id,
      source_type: "kopvast",
      source_url: websiteUrl,
      source_name: `Kopvast Scout (${source})`,
      notes: note,
    });
    return existing.id as string;
  }
  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      company_name: null,
      domain,
      website_url: websiteUrl,
      source_type: "kopvast",
      source_reference: `scout_${source}`,
      status: "SCANNING",
      notes: note,
      public_check_token: crypto.randomUUID().replace(/-/g, ""),
      last_activity_at: nowIso(),
    })
    .select("id")
    .single();
  if (error || !created) return null;
  await updateLead(leadId, { prospect_id: created.id });
  return created.id as string;
}

async function linkProspectWithoutWebsite(record: ScoutLead) {
  const supabase = scoutServiceClient();
  if (!supabase || !record.company_name) return null;
  if (record.prospect_id) return record.prospect_id;
  const identity = record.email
    ? prospectIdentityKey(record.email, record.company_name)
    : prospectIdentityForProfile({ email: null, phone: record.phone, company: record.company_name });
  const { data: existing } = await supabase
    .from("prospects")
    .select("id")
    .eq("is_archived", false)
    .is("domain", null)
    .eq("identity_key", identity)
    .maybeSingle();
  if (existing?.id) {
    await updateLead(record.id, { prospect_id: existing.id });
    return existing.id as string;
  }
  if (record.email) {
    const { data: emailOwner } = await supabase
      .from("prospect_contacts")
      .select("prospect_id")
      .ilike("email", normalizeEmail(record.email))
      .limit(1)
      .maybeSingle();
    if (emailOwner?.prospect_id) {
      await updateLead(record.id, { prospect_id: emailOwner.prospect_id });
      return emailOwner.prospect_id as string;
    }
  }
  const suppression = record.email ? await findSuppression(supabase, { email: record.email }) : null;
  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      company_name: record.company_name,
      contact_name: record.contact_name,
      first_name: record.first_name,
      last_name: record.last_name,
      phone: record.phone,
      city: record.city,
      facebook_url: record.facebook_url,
      social_url: record.social_url,
      domain: null,
      website_url: null,
      identity_key: identity,
      source_type: "kopvast",
      source_reference: `scout_${record.source}`,
      status: "NEW",
      notes: record.note,
      contact_status: suppression ? "BLOCKED" : "UNKNOWN",
      contact_source: "scout",
      do_not_contact: Boolean(suppression),
      legal_note: suppression ? `Suppression: ${suppression.reason}` : null,
      public_check_token: crypto.randomUUID().replace(/-/g, ""),
      last_activity_at: nowIso(),
      opportunity_score: null,
      website_score: null,
    })
    .select("id")
    .single();
  if (error || !created) return null;
  if (record.email) {
    await supabase.from("prospect_contacts").insert({
      prospect_id: created.id,
      email: normalizeEmail(record.email),
      first_name: record.first_name,
      last_name: record.last_name,
      email_source: "scout",
      contact_status: suppression ? "BLOCKED" : "UNKNOWN",
      do_not_contact: Boolean(suppression),
    });
  }
  await supabase.from("prospect_sources").insert({
    prospect_id: created.id,
    source_type: "kopvast",
    source_url: record.source_url,
    source_name: `Kopvast Scout (${record.source})`,
    notes: record.note,
  });
  await updateLead(record.id, { prospect_id: created.id });
  return created.id as string;
}

async function finishLeadWithoutWebsite(record: ScoutLead) {
  await updateLead(record.id, {
    status: "nieuw",
    pipeline_stage: "qualify",
    score: null,
    last_error: null,
    last_scan_at: null,
    why_interesting: null,
    commercial_summary: null,
    biggest_opportunity: null,
    opportunities: [],
  });
  await linkProspectWithoutWebsite(record);
  const letter = buildPersonalApproachLetter({
    companyName: record.company_name,
    domain: null,
    place: record.city,
    websitePresence: "NO_WEBSITE",
    greeting: greetingForContact(knownFirstName({ firstName: record.first_name, contactName: record.contact_name })),
  });
  await upsertDraft(record.id, { subject: letter.subject, message: letter.body });
  await updateLead(record.id, { status: "concept_klaar", pipeline_stage: "draft", score: null, last_scan_at: null });
  await appendEvent({
    lead_id: record.id,
    event_type: "draft_generated",
    actor_type: "agent",
    metadata: { website: false, sufficient: letter.sufficient },
  });
  await syncProspectFromScout(record.id);
}

export async function runLeadPipeline(leadId: string) {
  const recordRow = await getLeadById(leadId);
  const record = recordRow
    ? {
        id: recordRow.id,
        user_id: recordRow.user_id,
        url: recordRow.url,
        domain: recordRow.domain,
        note: recordRow.note,
        company_name: recordRow.company_name,
        email: recordRow.email,
        source: recordRow.source,
      }
    : null;
  if (!record || !recordRow) throw new Error("Lead ontbreekt.");
  if (!scoutLeadHasWebsite(recordRow)) {
    await finishLeadWithoutWebsite(recordRow);
    return;
  }

  await updateLead(record.id, { status: "scannen", pipeline_stage: "scan", last_error: null });
  await appendEvent({ lead_id: record.id, event_type: "scan_started", actor_type: "system", metadata: {} });
  await linkProspect(record.id, record.domain, record.url, record.note, record.source);
  await syncProspectFromScout(record.id);

  if (!allowExpensiveSideEffects()) {
    await updateLead(record.id, {
      status: "nieuw",
      pipeline_stage: "capture",
      last_error: "Preview verwerkt leads niet automatisch.",
    });
    await syncProspectFromScout(record.id);
    return;
  }

  try {
    const { facts, findings } = await scanPublicWebsite(record.url);
    const enrichment = enrichFromFacts(facts);
    const email = pickLeadEmail(record.email, enrichment.email.value);
    if (email) Object.assign(enrichment, withManualEmailEnrichment(enrichment, email));
    const inferredName = enrichment.company_name.value || facts.title || record.domain;
    const companyName = pickStoredCompanyName(inferredName, record.company_name) || record.domain;
    await updateLead(record.id, {
      pipeline_stage: "enrich",
      company_name: companyName,
      canonical_url: enrichment.canonical_url.value,
      email,
      phone: enrichment.phone.value,
      linkedin_url: enrichment.linkedin_url.value,
      city: enrichment.city.value,
      description: enrichment.description.value,
      enrichment,
    });

    await updateLead(record.id, { pipeline_stage: "analyse" });
    const analysis = await analyseScoutLead({
      domain: record.domain,
      url: facts.fetchedUrl,
      companyName,
      note: record.note,
      facts,
      findings,
      place: enrichment.city.value,
    });

    if (analysis.industry) {
      const current = (await (async () => enrichment)()) as ScoutEnrichment;
      current.industry = { value: analysis.industry, kind: analysis.industryInferred ? "inferred" : "found" };
      await updateLead(record.id, {
        industry: analysis.industry,
        enrichment: current,
        city: analysis.city || enrichment.city.value,
      });
    }

    await insertScan({
      id: newId(),
      lead_id: record.id,
      technical_score: analysis.scores.technical,
      conversion_score: analysis.scores.conversion,
      design_score: analysis.scores.design,
      brand_score: analysis.scores.brand,
      content_score: analysis.scores.content,
      overall_score: analysis.scores.overall,
      findings: analysis.findings,
      opportunities: analysis.opportunities,
      commercial_summary: analysis.commercial_summary,
      raw_scan_data: {
        facts: {
          fetchedUrl: facts.fetchedUrl,
          title: facts.title,
          https: facts.https,
          wordCount: facts.wordCount,
          forms: facts.forms,
        },
        usedAi: analysis.usedAi,
        note_preserved: record.note,
      },
      status: "completed",
      error_message: null,
    });

    await updateLead(record.id, {
      status: "geanalyseerd",
      pipeline_stage: "qualify",
      score: analysis.scores.overall,
      why_interesting: analysis.why_interesting,
      commercial_summary: analysis.commercial_summary,
      biggest_opportunity: analysis.biggest_opportunity,
      opportunities: analysis.opportunities,
      last_scan_at: nowIso(),
      last_error: null,
    });
    await appendEvent({
      lead_id: record.id,
      event_type: "scan_completed",
      actor_type: "system",
      metadata: { score: analysis.scores.overall, usedAi: analysis.usedAi },
    });

    await upsertDraft(record.id, { subject: analysis.draftSubject, message: analysis.draftMessage });
    await updateLead(record.id, { status: "concept_klaar", pipeline_stage: "draft" });
    await appendEvent({ lead_id: record.id, event_type: "draft_generated", actor_type: "agent", metadata: {} });
    await syncProspectFromScout(record.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan mislukt.";
    await updateLead(record.id, {
      status: "scan_mislukt",
      pipeline_stage: "scan",
      last_error: message.slice(0, 400),
      last_scan_at: nowIso(),
    });
    await appendEvent({
      lead_id: record.id,
      event_type: "scan_failed",
      actor_type: "system",
      metadata: { message: message.slice(0, 200) },
    });
    const failed = await getLeadById(record.id);
    if (failed?.email) {
      const { ensureScoutUnreachableDraft } = await import("./unreachable");
      await ensureScoutUnreachableDraft(failed);
    }
    await syncProspectFromScout(record.id);
    throw error;
  }
}

export async function processScoutJobs(limit = 4) {
  const jobs = await claimPendingJobs(limit);
  const results: Array<{ id: string; ok: boolean }> = [];
  for (const job of jobs) {
    try {
      await runLeadPipeline(job.lead_id);
      await completeJob(job.id);
      results.push({ id: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "onbekende fout";
      await failJob(job, message);
      results.push({ id: job.id, ok: false });
    }
  }
  return results;
}
