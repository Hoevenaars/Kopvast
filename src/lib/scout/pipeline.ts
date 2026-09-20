import { pickLeadEmail, withManualEmailEnrichment } from "@/lib/contact-email";
import { newId, nowIso } from "@/lib/workspace-store";
import { allowExpensiveSideEffects } from "./config";
import { analyseScoutLead } from "./ai";
import { scoutServiceClient } from "./auth";
import { enrichFromFacts } from "./enrichment";
import { enqueuePipelineJob, failJob, claimPendingJobs, completeJob } from "./jobs";
import { appendEvent, getLeadById, insertScan, updateLead, upsertDraft } from "./leads";
import { scanPublicWebsite } from "./scanner";
import { syncProspectFromScout } from "./crm";
import type { ScoutEnrichment } from "./types";

export { enqueuePipelineJob };

async function linkProspect(leadId: string, domain: string, websiteUrl: string, note: string | null, source: string) {
  const supabase = scoutServiceClient();
  if (!supabase) return null;
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
  if (!record) throw new Error("Lead ontbreekt.");

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
    const companyName =
      enrichment.company_name.value || record.company_name || facts.title || record.domain;
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
