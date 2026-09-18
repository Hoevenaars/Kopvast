import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshClient } from "./refresh";
import { normalizeWebsiteUrl } from "./ssrf";
import { scanWebsite, type ScanFinding, type ScanResult } from "./scan";
import {
  AI_ANALYSIS_SCHEMA,
  AI_SYSTEM_PROMPT,
  domainFromUrl,
  mapKopvastFindings,
  parseAiAnalysis,
  type AiAnalysis,
  type MappedFinding,
} from "./acquire-map";
import { calculateOpportunityScore, thresholdsFromSettings } from "./acquire-score";
import { detectComplexityFlags, determineProductFit } from "./acquire-fit";
import { ACTIVITY, adminStatusFromScore, emptyScanProgress, SCANNER_VERSION, SCORE_VERSION, type ScanStepKey } from "./acquisition-constants";
import { logProspectActivity, refreshProspectCosts } from "./acquisition-activity";
import { upsertContact } from "./acquisition";
import { storeGeneratedMail } from "./acquisition-send";
import type { MailFinding } from "./acquisition-mail";

const AI_REPEAT_HOURS = 24;
const OPENAI_INPUT_PER_MILLION = 0.4;
const OPENAI_OUTPUT_PER_MILLION = 1.6;

export type AcquireLead = {
  name: string;
  email: string;
  company?: string;
  message?: string;
};

type ProspectRow = {
  id: string;
  status: string;
  last_scan_at: string | null;
  company_name: string | null;
  notes: string | null;
};

type AcquireSource = "websitecheck" | "kansen" | "aanvraag" | "admin";

export async function acquireScan(result: ScanResult, submittedUrl?: string): Promise<void> {
  if (result.status === "invalid" || result.status === "blocked") return;
  const website = result.status === "ok" ? result.url : submittedUrl ?? "";
  if (!website.trim()) return;
  await acquireWebsite({
    website,
    source: "websitecheck",
    title: result.status === "ok" ? result.title : null,
    findings: result.status === "ok" ? result.findings : [],
    fetchedUrl: result.status === "ok" ? result.fetchedUrl : undefined,
    reachable: result.status === "ok",
  });
}

export async function acquireLead(lead: AcquireLead & { website?: string }): Promise<void> {
  if (!lead.website?.trim()) return;
  await acquireWebsite({
    website: lead.website,
    source: "aanvraag",
    company: lead.company,
    lead,
    reachable: true,
  });
}

export async function acquireAdminScan(input: {
  prospectId: string;
  scanId: string;
  website: string;
  force?: boolean;
}): Promise<void> {
  const supabase = refreshClient();
  if (!supabase) return;
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, status, last_scan_at, company_name, notes, website_url")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!prospect) return;

  const website = input.website.trim() || prospect.website_url || "";
  const result = await scanWebsite(website);
  if (result.status !== "ok") {
    await acquireWebsite({
      website,
      source: "admin",
      company: prospect.company_name ?? undefined,
      prospectId: input.prospectId,
      scanId: input.scanId,
      force: input.force ?? true,
      generateMail: false,
      reachable: false,
    });
    return;
  }

  await acquireWebsite({
    website: result.url,
    source: "admin",
    title: result.title,
    findings: result.findings,
    fetchedUrl: result.fetchedUrl,
    company: prospect.company_name ?? result.title ?? undefined,
    prospectId: input.prospectId,
    scanId: input.scanId,
    force: input.force ?? true,
    generateMail: true,
    reachable: true,
  });
}

async function acquireWebsite(input: {
  website: string;
  source: AcquireSource;
  company?: string;
  title?: string | null;
  findings?: ScanFinding[];
  fetchedUrl?: string;
  reachable: boolean;
  lead?: AcquireLead;
  prospectId?: string;
  scanId?: string;
  force?: boolean;
  generateMail?: boolean;
}): Promise<void> {
  const supabase = refreshClient();
  if (!supabase) {
    console.info("[kopvast] Website Refresh overgeslagen (geen WEBSITE_REFRESH_SERVICE_ROLE_KEY)");
    return;
  }

  let url: URL;
  try {
    url = normalizeWebsiteUrl(input.website || input.fetchedUrl || "");
  } catch {
    return;
  }

  const domain = domainFromUrl(url.toString());
  const websiteUrl = `${url.protocol}//${url.host}`;
  const sourceName =
    input.source === "aanvraag"
      ? "Kopvast aanvraag"
      : input.source === "admin"
        ? "Kopvast admin"
        : "Kopvast websitecheck";

  let prospect = input.prospectId
    ? ((await supabase
        .from("prospects")
        .select("id, status, last_scan_at, company_name, notes")
        .eq("id", input.prospectId)
        .maybeSingle()).data as ProspectRow | null)
    : null;

  if (!prospect) {
    const { data: existing, error: lookupError } = await supabase
      .from("prospects")
      .select("id, status, last_scan_at, company_name, notes")
      .eq("is_archived", false)
      .ilike("domain", domain)
      .maybeSingle();
    if (lookupError) {
      console.error("[kopvast] Prospect-lookup mislukt", lookupError.message);
      return;
    }
    prospect = existing as ProspectRow | null;
  }

  if (!prospect) {
    const { data: created, error } = await supabase
      .from("prospects")
      .insert({
        company_name: input.company || input.lead?.company || input.title || null,
        domain,
        website_url: websiteUrl,
        source_type: "kopvast",
        source_reference: `kopvast_${input.source}`,
        status: input.reachable ? "NEW" : "SCAN_FAILED",
        reject_reason: input.reachable ? null : "website_unreachable",
        notes: leadNote(input.lead),
        needs_review: input.source === "aanvraag",
        needs_review_reasons: input.source === "aanvraag" ? ["inbound_lead"] : [],
        public_check_token: crypto.randomUUID().replace(/-/g, ""),
        last_activity_at: new Date().toISOString(),
      })
      .select("id, status, last_scan_at, company_name, notes")
      .single();
    if (error || !created) {
      console.error("[kopvast] Prospect aanmaken mislukt", error?.message);
      return;
    }
    prospect = created as ProspectRow;
  } else if (input.lead) {
    const note = leadNote(input.lead);
    await supabase
      .from("prospects")
      .update({
        company_name: input.company || input.lead.company || prospect.company_name,
        notes: [prospect.notes, note].filter(Boolean).join("\n\n"),
        needs_review: true,
        needs_review_reasons: ["inbound_lead"],
        status: inboundStatus(prospect.status),
      })
      .eq("id", prospect.id);
  }

  if (input.lead?.email) {
    await upsertContact(supabase, { prospectId: prospect.id, email: input.lead.email, source: "aanvraag" });
  }

  await supabase.from("prospect_sources").insert({
    prospect_id: prospect.id,
    source_type: "kopvast",
    source_url: websiteUrl,
    source_name: sourceName,
    notes: input.lead ? `${input.lead.name} <${input.lead.email}>` : null,
  });

  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: input.source === "aanvraag" ? "kopvast_aanvraag" : input.source === "admin" ? ACTIVITY.SCAN_STARTED : "kopvast_websitecheck",
    actorType: input.source === "admin" ? "human" : "system",
    actorId: "kopvast.nl",
    newStatus: prospect.status,
    metadata: { domain, source: input.source, reachable: input.reachable },
  });

  let scanId = input.scanId;
  if (scanId) {
    await supabase
      .from("website_scans")
      .update({
        status: "running",
        website_url: websiteUrl,
        canonical_domain: domain,
        scanner_version: SCANNER_VERSION,
        progress: emptyScanProgress(),
      })
      .eq("id", scanId);
    await supabase.from("prospects").update({ status: "SCANNING" }).eq("id", prospect.id);
  }

  if (!input.reachable) {
    await failScan(supabase, {
      prospectId: prospect.id,
      scanId,
      domain,
      websiteUrl,
      reason: "website_unreachable",
      message: "Website niet bereikbaar",
    });
    return;
  }

  if (scanId) await markProgress(supabase, scanId, "reachable", "done");

  if (!input.force && (await recentlyAnalysed(supabase, prospect.id))) {
    if (scanId) {
      await supabase
        .from("website_scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          http_status: 200,
          ssl_valid: url.protocol === "https:",
        })
        .eq("id", scanId);
    }
    return;
  }

  const mapped = mapKopvastFindings(input.findings ?? []);
  if (!scanId) {
    const { data: scan, error: scanError } = await supabase
      .from("website_scans")
      .insert({
        prospect_id: prospect.id,
        status: "completed",
        completed_at: new Date().toISOString(),
        pages_requested: 1,
        pages_scanned: 1,
        http_status: 200,
        ssl_valid: url.protocol === "https:",
        scanner_version: SCANNER_VERSION,
        website_url: websiteUrl,
        canonical_domain: domain,
        progress: emptyScanProgress().map((step) => ({ ...step, status: "done", at: new Date().toISOString() })),
      })
      .select("id")
      .single();
    if (scanError || !scan) {
      console.error("[kopvast] Scanrecord mislukt", scanError?.message);
      return;
    }
    scanId = scan.id;
  } else {
    await supabase
      .from("website_scans")
      .update({
        pages_requested: 1,
        pages_scanned: 1,
        http_status: 200,
        ssl_valid: url.protocol === "https:",
      })
      .eq("id", scanId);
  }

  if (!scanId) return;

  await supabase.from("scanned_pages").insert({
    scan_id: scanId,
    url: input.fetchedUrl || websiteUrl,
    page_type: "home",
    title: input.title ?? null,
    http_status: 200,
    has_form: !(input.findings ?? []).some((item) => item.id === "contact"),
    extracted_text: (input.findings ?? []).map((item) => item.evidence).join("\n"),
  });

  if (mapped.length) {
    await insertFindings(supabase, prospect.id, scanId, mapped);
  }
  if (scanId) {
    await markProgress(supabase, scanId, "scanned", "done");
    await markProgress(supabase, scanId, "findings", mapped.length ? "done" : "pending");
  }

  await supabase.from("prospects").update({ status: "ANALYSING" }).eq("id", prospect.id);

  const settings = await loadAiSettings(supabase);
  const analysis = settings.enabled
    ? await analyseHomepage({
        url: websiteUrl,
        domain,
        companyName: input.company || input.lead?.company || input.title,
        title: input.title,
        findings: mapped,
        model: settings.model,
      })
    : null;

  if (scanId) await markProgress(supabase, scanId, "content", analysis ? "done" : mapped.length ? "done" : "failed");

  const htmlText = (input.findings ?? []).map((item) => `${item.title} ${item.detail} ${item.evidence}`).join("\n");
  const flags = detectComplexityFlags({
    title: input.title,
    htmlText,
    findings: [
      ...mapped,
      ...((analysis?.analysis.findings ?? []).map((finding) => ({
        category: finding.category,
        finding_type: finding.type,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        confidence: finding.confidence,
        evidence_type: "ai",
        evidence_reference: finding.evidence_reference,
        created_by: "agent" as const,
      })) satisfies MappedFinding[]),
    ],
  });
  const fit = determineProductFit({
    flags,
    unsupportedLanguage: analysis?.analysis.unsupported_language,
    insufficientEvidence: !mapped.length && !analysis,
  });

  const allFindings: MappedFinding[] = [
    ...mapped,
    ...((analysis?.analysis.findings ?? []).map((finding) => ({
      category: finding.category,
      finding_type: finding.type,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      confidence: finding.confidence,
      evidence_type: "ai",
      evidence_reference: finding.evidence_reference,
      created_by: "agent" as const,
    })) satisfies MappedFinding[]),
  ];

  const score = calculateOpportunityScore({
    visual: analysis?.analysis.visual_score,
    conversion: analysis?.analysis.conversion_score,
    content: analysis?.analysis.content_score,
    commercialFit: analysis?.analysis.commercial_fit,
    productFit: fit.fit,
    findings: allFindings,
    thresholds: settings.thresholds,
  });

  const finalStatus =
    input.source === "aanvraag"
      ? inboundStatus(prospect.status)
      : input.source === "admin"
        ? adminStatusFromScore(score.status)
        : score.status;

  if (analysis?.analysis.findings.length) {
    await insertFindings(
      supabase,
      prospect.id,
      scanId,
      analysis.analysis.findings.map((finding) => ({
        category: finding.category,
        finding_type: finding.type,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        confidence: finding.confidence,
        evidence_type: "ai",
        evidence_reference: finding.evidence_reference,
        created_by: "agent" as const,
      }))
    );
  }

  await supabase.from("product_fit_checks").insert({
    prospect_id: prospect.id,
    scan_id: scanId,
    ...flags,
    estimated_page_count: 1,
    standard_product_fit: fit.fit === "STANDARD_FIT",
    fit_label: fit.fit,
    fit_reason: fit.reason,
    complexity_score: fit.complexityScore,
  });

  const { data: scoreRow } = await supabase
    .from("prospect_scores")
    .insert({
      prospect_id: prospect.id,
      scan_id: scanId,
      technical_score: 55,
      mobile_score: 50,
      conversion_score: analysis?.analysis.conversion_score ?? 50,
      visual_score: analysis?.analysis.visual_score ?? 50,
      content_score: analysis?.analysis.content_score ?? 50,
      commercial_fit_score: score.commercialFit,
      product_fit_score: score.productFit,
      complexity_score: fit.complexityScore,
      opportunity_score: score.total,
      website_improvement_potential: score.websiteImprovement,
      evidence_quality_score: score.evidenceQuality,
      website_score: score.total,
      score_version: SCORE_VERSION,
      breakdown: {
        source: input.source,
        recommendation: analysis?.analysis.recommendation ?? null,
        commercial_fit_reason: analysis?.analysis.commercial_fit_reason ?? fit.reason,
        weights: {
          websiteImprovement: score.websiteImprovement,
          commercialFit: score.commercialFit,
          productFit: score.productFit,
          evidenceQuality: score.evidenceQuality,
        },
      },
    })
    .select("id")
    .single();

  await supabase
    .from("prospects")
    .update({
      industry: analysis?.analysis.industry ?? undefined,
      industry_confidence: analysis?.analysis.industry_confidence ?? undefined,
      city: analysis?.analysis.city ?? undefined,
      country: analysis?.analysis.country ?? "NL",
      company_size_estimate: analysis?.analysis.company_size_estimate ?? undefined,
      company_size_confidence: analysis?.analysis.company_size_confidence ?? undefined,
      ai_recommendation: analysis?.analysis.recommendation ?? null,
      status: finalStatus,
      reject_reason:
        finalStatus === "REJECTED"
          ? analysis?.analysis.unsupported_language
            ? "unsupported_language"
            : "low_commercial_value"
          : null,
      website_score: score.total,
      commercial_fit_score: score.commercialFit,
      product_fit_score: score.productFit,
      complexity_score: fit.complexityScore,
      opportunity_score: score.total,
      product_fit: fit.fit,
      last_scan_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      company_name: input.company || input.lead?.company || input.title || prospect.company_name,
      needs_review: input.source === "aanvraag" || fit.fit === "REVIEW_REQUIRED" || finalStatus === "WATCHLIST" || finalStatus === "NEW",
      needs_review_reasons: input.source === "aanvraag" ? ["inbound_lead"] : fit.fit === "REVIEW_REQUIRED" ? ["review_required"] : finalStatus === "WATCHLIST" ? ["ai_watchlist"] : [],
    })
    .eq("id", prospect.id);

  if (scanId) {
    await markProgress(supabase, scanId, "findings", "done");
    await markProgress(supabase, scanId, "fit", "done");
    await markProgress(supabase, scanId, "score", "done");
  }

  if (analysis) {
    const amount =
      (analysis.tokensInput / 1_000_000) * OPENAI_INPUT_PER_MILLION +
      (analysis.tokensOutput / 1_000_000) * OPENAI_OUTPUT_PER_MILLION;
    if (amount || analysis.tokensInput || analysis.tokensOutput) {
      await supabase.from("cost_events").insert({
        prospect_id: prospect.id,
        scan_id: scanId,
        cost_type: "ai",
        provider: "openai",
        amount,
        tokens_input: analysis.tokensInput,
        tokens_output: analysis.tokensOutput,
      });
    }
    await logProspectActivity(supabase, {
      prospectId: prospect.id,
      eventType: ACTIVITY.ANALYSIS_COMPLETED,
      actorType: "agent",
      newStatus: finalStatus,
      metadata: { recommendation: analysis.analysis.recommendation, industry: analysis.analysis.industry },
    });
  }

  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.SCORE_CALCULATED,
    actorType: "system",
    newStatus: finalStatus,
    metadata: { total: score.total, fit: fit.fit },
  });
  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.PRODUCT_FIT_SET,
    actorType: "system",
    newStatus: finalStatus,
    metadata: { fit: fit.fit, reason: fit.reason },
  });

  if (input.generateMail && scanId) {
    const { data: findings } = await supabase
      .from("findings")
      .select("id, finding_type, category, title, description, severity, confidence")
      .eq("prospect_id", prospect.id)
      .eq("scan_id", scanId);
    await storeGeneratedMail(supabase, {
      prospectId: prospect.id,
      scanId,
      analysisId: scoreRow?.id ?? null,
      companyName: input.company || input.lead?.company || input.title || prospect.company_name,
      domain,
      fit: fit.fit,
      findings: (findings ?? []) as MailFinding[],
    });
    await markProgress(supabase, scanId, "mail", "done");
  } else if (scanId) {
    await markProgress(supabase, scanId, "mail", "pending");
  }

  if (scanId) {
    await supabase
      .from("website_scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  }
  await logProspectActivity(supabase, {
    prospectId: prospect.id,
    eventType: ACTIVITY.SCAN_COMPLETED,
    actorType: "system",
    newStatus: finalStatus,
    metadata: { scanId, score: score.total },
  });
  await refreshProspectCosts(supabase, prospect.id);
}

async function failScan(
  supabase: SupabaseClient,
  input: { prospectId: string; scanId?: string; domain: string; websiteUrl: string; reason: string; message: string }
) {
  if (input.scanId) {
    await markProgress(supabase, input.scanId, "reachable", "failed");
    await supabase
      .from("website_scans")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: input.reason,
        error_message: input.message,
        website_url: input.websiteUrl,
        canonical_domain: input.domain,
      })
      .eq("id", input.scanId);
  }
  await supabase
    .from("prospects")
    .update({
      status: "SCAN_FAILED",
      reject_reason: input.reason,
      last_scan_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      needs_review: true,
      needs_review_reasons: ["scan_failed"],
    })
    .eq("id", input.prospectId);
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.SCAN_FAILED,
    actorType: "system",
    newStatus: "SCAN_FAILED",
    metadata: { reason: input.reason },
  });
}

async function markProgress(supabase: SupabaseClient, scanId: string, key: ScanStepKey, status: "done" | "failed" | "pending") {
  const { data } = await supabase.from("website_scans").select("progress").eq("id", scanId).maybeSingle();
  const current = Array.isArray(data?.progress) ? data.progress : emptyScanProgress();
  const progress = emptyScanProgress().map((step) => {
    const prior = current.find((item: { key?: string }) => item.key === step.key);
    if (step.key === key) return { ...step, status, at: new Date().toISOString() };
    return prior ? { ...step, ...prior } : step;
  });
  await supabase.from("website_scans").update({ progress }).eq("id", scanId);
}

function leadNote(lead?: AcquireLead): string | null {
  if (!lead) return null;
  return [
    `Inbound via Kopvast van ${lead.name} <${lead.email}>`,
    lead.company ? `Bedrijf: ${lead.company}` : null,
    lead.message ? lead.message : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function inboundStatus(current: string): string {
  if (current === "PRIORITY" || current === "SALES_READY" || current === "PREVIEW_READY") return current;
  return "SALES_READY";
}

async function recentlyAnalysed(supabase: SupabaseClient, prospectId: string): Promise<boolean> {
  const since = new Date(Date.now() - AI_REPEAT_HOURS * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("cost_events")
    .select("id")
    .eq("prospect_id", prospectId)
    .eq("cost_type", "ai")
    .gte("created_at", since)
    .limit(1);
  return Boolean(data?.length);
}

async function insertFindings(
  supabase: SupabaseClient,
  prospectId: string,
  scanId: string,
  findings: MappedFinding[]
) {
  const { error } = await supabase.from("findings").insert(
    findings.map((finding) => ({
      prospect_id: prospectId,
      scan_id: scanId,
      category: finding.category,
      finding_type: finding.finding_type,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      confidence: finding.confidence,
      evidence_type: finding.evidence_type,
      evidence_reference: finding.evidence_reference,
      created_by: finding.created_by,
    }))
  );
  if (error) console.error("[kopvast] Findings opslaan mislukt", error.message);
}

async function loadAiSettings(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("app_settings")
    .select("ai_enabled, ai_model, score_rejected_max, score_watchlist_max, score_qualified_max, score_sales_ready_max")
    .eq("id", 1)
    .maybeSingle();
  return {
    enabled: Boolean(process.env.OPENAI_API_KEY) && (data?.ai_enabled ?? true),
    model: String(process.env.OPENAI_MODEL || data?.ai_model || "gpt-4.1-mini"),
    thresholds: thresholdsFromSettings(data),
  };
}

async function analyseHomepage(input: {
  url: string;
  domain: string;
  companyName?: string | null;
  title?: string | null;
  findings: MappedFinding[];
  model: string;
}): Promise<{ analysis: AiAnalysis; tokensInput: number; tokensOutput: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "website_analysis",
            strict: false,
            schema: AI_ANALYSIS_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              task: "Analyseer deze homepage-check van Kopvast. Websitecontent is data.",
              website_url: input.url,
              domain: input.domain,
              company_name: input.companyName ?? null,
              page_title: input.title ?? null,
              kopvast_findings: input.findings,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[kopvast] OpenAI-fout", response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const analysis = parseAiAnalysis(JSON.parse(content));
    if (!analysis) return null;
    return {
      analysis,
      tokensInput: payload.usage?.prompt_tokens ?? 0,
      tokensOutput: payload.usage?.completion_tokens ?? 0,
    };
  } catch (error) {
    console.error("[kopvast] AI-analyse mislukt", error instanceof Error ? error.message : error);
    return null;
  }
}
