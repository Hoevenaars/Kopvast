import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { fromAddress } from "./email";
import { refreshClient } from "./refresh";
import { addSuppression } from "./suppression";
import { getEmailMode, getTestEmail, recipientForMode, resolveEmailSettings } from "./email-mode";
import { prepareTrackedAcquisitionEmail, prepareTrackedShortAcquisitionEmail } from "./acquisition-clicks";
import { generateAcquisitionMail, fallbackAcquisitionMail, type MailFinding } from "./acquisition-mail";
import { DUPLICATE_EMAIL_CONTENT_ERROR, findDuplicatedAcquisitionContent } from "@/emails/acquisition-outreach-copy";
import { logProspectActivity, refreshProspectCosts } from "./acquisition-activity";
import { loadProspectDetail, type ProspectDetail, type ProspectMail } from "./acquisition";
import {
  ACTIVITY,
  BLOCKING_CONTACT_STATUSES,
  CONTACT_STATUSES_ALLOWED_TO_SEND,
  MAIL_PROMPT_VERSION,
  MAIL_TEMPLATE_VERSION,
  SCOUT_MAIL_PROMPT_VERSION,
  SCOUT_MAIL_TEMPLATE_VERSION,
  type ProductFit,
} from "./acquisition-constants";
import { isEmail, normalizeEmail } from "./product";
import {
  findingsFromManualReasons,
  mailHasFindings,
  MANUAL_REASONS_PROMPT_VERSION,
  parseManualReasonCategories,
} from "./acquisition/manual-reasons";
import {
  autoFollowUpIdempotencyKey,
  buildAutoFollowUpBody,
  cancelPendingAutoFollowUp,
  followUpBlockReason,
  followUpChoicePrice,
  isShortAcquisitionKind,
  listDueAutoFollowUpIds,
  loadFollowUpCommercialFlags,
  scheduleAutoFollowUp,
  snapshotFromDetail,
  AUTO_FOLLOW_UP_TEMPLATE_VERSION,
} from "./acquisition/follow-up";
import {
  buildUnreachableSiteMail,
  isUnreachableProspect,
  isUnreachableSiteMail,
  UNREACHABLE_SITE_PROMPT_VERSION,
  UNREACHABLE_SITE_TEMPLATE_VERSION,
} from "./acquisition/unreachable-site-mail";

export const TEST_MAIL_IDEMPOTENCY_WINDOW_MS = 15_000;

export function testMailIdempotencyKey(mailId: string, at = Date.now()) {
  return `acquisition-test/${mailId}/${Math.floor(at / TEST_MAIL_IDEMPOTENCY_WINDOW_MS)}`;
}

export function isScoutCaptureMail(
  mail: { prompt_version?: string | null; template_version?: string | null } | null | undefined
) {
  if (!mail) return false;
  return mail.prompt_version === SCOUT_MAIL_PROMPT_VERSION || mail.template_version === SCOUT_MAIL_TEMPLATE_VERSION;
}

export type PreSendIssue = { code: string; message: string };

export function evaluatePreSend(input: {
  prospect: ProspectDetail;
  mail: ProspectMail | null;
  live: boolean;
  auto?: boolean;
}): PreSendIssue[] {
  const issues: PreSendIssue[] = [];
  if (!input.prospect) issues.push({ code: "missing_prospect", message: "Prospect ontbreekt." });
  const email = input.prospect.contact?.email;
  if (!email) issues.push({ code: "missing_email", message: "Er is geen e-mailadres gekoppeld." });
  else if (!isEmail(email)) issues.push({ code: "invalid_email", message: "Het e-mailadres is ongeldig." });
  if (input.prospect.do_not_contact || input.prospect.contact?.do_not_contact) {
    issues.push({ code: "do_not_contact", message: "Dit contact staat op niet-benaderen." });
  }
  if (BLOCKING_CONTACT_STATUSES.includes(input.prospect.contact_status)) {
    issues.push({ code: "contact_blocked", message: "De contactstatus blokkeert verzending." });
  }
  if (email && !CONTACT_STATUSES_ALLOWED_TO_SEND.includes(input.prospect.contact_status) && input.live) {
    if (!issues.some((item) => item.code === "contact_blocked")) {
      issues.push({ code: "contact_rule", message: "De contactregel staat LIVE verzending niet toe." });
    }
  }
  if (input.prospect.suppression) {
    issues.push({
      code: "suppressed",
      message: `Verzending geblokkeerd (${input.prospect.suppression.reason}).`,
    });
  }
  if (input.prospect.auto_outreach_blocked && input.live) {
    issues.push({ code: "auto_blocked", message: "Verdere outreach is geblokkeerd na de laatste reactie." });
  }
  if (!input.mail) issues.push({ code: "missing_mail", message: "Er is nog geen acquisitiemail." });
  if (input.mail && !input.mail.subject?.trim()) issues.push({ code: "missing_subject", message: "De mail heeft geen onderwerp." });
  if (input.mail && !input.mail.body_text?.trim()) issues.push({ code: "missing_body", message: "De mail heeft geen inhoud." });
  if (input.mail?.body_text && findDuplicatedAcquisitionContent(input.mail.body_text)) {
    issues.push({ code: "duplicated_content", message: DUPLICATE_EMAIL_CONTENT_ERROR });
  }
  const used = input.mail?.findings_used;
  const hasFindings = Array.isArray(used) ? used.length > 0 : Boolean(used);
  const scoutCapture = isScoutCaptureMail(input.mail);
  const shortFollowUp = isShortAcquisitionKind(input.mail?.kind);
  const unreachable =
    isUnreachableSiteMail(input.mail?.body_text) ||
    (isUnreachableProspect({
      status: input.prospect.status,
      scanStatus: input.prospect.scan?.status,
      scanError: input.prospect.scan?.error_message,
    }) &&
      !hasFindings &&
      input.mail?.prompt_version !== MANUAL_REASONS_PROMPT_VERSION);
  if (input.mail && !input.mail.scan_id && !unreachable && !hasFindings && !scoutCapture && !shortFollowUp) {
    issues.push({ code: "missing_scan", message: "De mail is niet aan een scan gekoppeld." });
  }
  if (input.auto && !unreachable && input.mail && !hasFindings) {
    issues.push({ code: "missing_findings", message: "Er zijn geen gebruikte findings bij deze mail." });
  }
  if (input.live && input.mail && ["queued", "sent", "delivered"].includes(input.mail.status)) {
    issues.push({ code: "duplicate_send", message: "Deze mail is al verzonden of staat in de wachtrij." });
  }
  return issues;
}

function renderFailure(error: unknown) {
  return {
    ok: false as const,
    message: error instanceof Error ? error.message : DUPLICATE_EMAIL_CONTENT_ERROR,
  };
}

export async function storeGeneratedMail(
  supabase: SupabaseClient,
  input: {
    prospectId: string;
    contactId?: string | null;
    scanId: string;
    analysisId?: string | null;
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
    place?: string | null;
    actorType?: "system" | "agent" | "human";
    actorId?: string;
  }
) {
  let place = input.place;
  if (place === undefined) {
    const { data: location } = await supabase
      .from("prospects")
      .select("city")
      .eq("id", input.prospectId)
      .maybeSingle();
    place = location?.city ?? null;
  }

  const generated = await generateAcquisitionMail({
    companyName: input.companyName,
    domain: input.domain,
    fit: input.fit,
    findings: input.findings,
    place,
  });
  let html: string;
  let body = generated.body;
  try {
    const prepared = await prepareTrackedAcquisitionEmail({
      prospectId: input.prospectId,
      domain: input.domain,
      companyName: input.companyName,
      subject: generated.subject,
      body: generated.body,
    });
    html = prepared.html;
    body = prepared.text;
  } catch (error) {
    console.error("[kopvast] Acquisitiemail renderen mislukt", error instanceof Error ? error.message : error);
    return null;
  }
  const { data: contact } = input.contactId
    ? await supabase.from("prospect_contacts").select("id, email").eq("id", input.contactId).maybeSingle()
    : await supabase
        .from("prospect_contacts")
        .select("id, email")
        .eq("prospect_id", input.prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const to = contact?.email ? contact.email : "";
  const { data: created, error } = await supabase
    .from("email_messages")
    .insert({
      prospect_id: input.prospectId,
      contact_id: contact?.id ?? input.contactId ?? null,
      scan_id: input.scanId,
      analysis_id: input.analysisId ?? null,
      kind: "acquisition_outreach",
      to_email: to || `draft@${input.domain}`,
      intended_to_email: to || null,
      subject: generated.subject,
      body_text: body,
      body_html: html,
      status: "draft",
      email_mode: await getEmailMode(),
      template_version: generated.templateVersion,
      prompt_version: generated.promptVersion,
      findings_used: generated.findingsUsed,
      provider: "resend",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[kopvast] Acquisitiemail opslaan mislukt", error.message);
    return null;
  }
  await prepareTrackedAcquisitionEmail({
    prospectId: input.prospectId,
    mailId: created.id,
    domain: input.domain,
    companyName: input.companyName,
    subject: generated.subject,
    body,
  }).catch(() => null);

  await supabase
    .from("prospects")
    .update({ mail_status: "draft", updated_at: new Date().toISOString() })
    .eq("id", input.prospectId);
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.MAIL_GENERATED,
    actorType: input.actorType ?? "agent",
    actorId: input.actorId ?? "kopvast.nl",
    metadata: { mailId: created?.id, prompt: MAIL_PROMPT_VERSION, template: MAIL_TEMPLATE_VERSION },
  });
  return created?.id ?? null;
}

export async function storeUnreachableSiteMail(
  supabase: SupabaseClient,
  input: {
    prospectId: string;
    contactId?: string | null;
    scanId?: string | null;
    companyName?: string | null;
    domain: string;
    actorType?: "system" | "agent" | "human";
    actorId?: string;
  }
) {
  const generated = buildUnreachableSiteMail({
    domain: input.domain,
    companyName: input.companyName,
  });
  let html: string;
  let body = generated.body;
  try {
    const prepared = await prepareTrackedAcquisitionEmail({
      prospectId: input.prospectId,
      domain: input.domain,
      companyName: input.companyName,
      subject: generated.subject,
      body: generated.body,
    });
    html = prepared.html;
    body = prepared.text;
  } catch (error) {
    console.error("[kopvast] Onbereikbare-site-mail renderen mislukt", error instanceof Error ? error.message : error);
    return null;
  }

  const { data: contact } = input.contactId
    ? await supabase.from("prospect_contacts").select("id, email").eq("id", input.contactId).maybeSingle()
    : await supabase
        .from("prospect_contacts")
        .select("id, email")
        .eq("prospect_id", input.prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  const to = contact?.email || `draft@${input.domain}`;

  const { data: created, error } = await supabase
    .from("email_messages")
    .insert({
      prospect_id: input.prospectId,
      contact_id: contact?.id ?? input.contactId ?? null,
      scan_id: input.scanId ?? null,
      kind: "acquisition_outreach",
      to_email: to,
      intended_to_email: contact?.email ?? null,
      subject: generated.subject,
      body_text: body,
      body_html: html,
      status: "draft",
      email_mode: await getEmailMode(),
      template_version: UNREACHABLE_SITE_TEMPLATE_VERSION,
      prompt_version: UNREACHABLE_SITE_PROMPT_VERSION,
      findings_used: [],
      provider: "resend",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[kopvast] Onbereikbare-site-mail opslaan mislukt", error.message);
    return null;
  }

  await supabase
    .from("prospects")
    .update({ mail_status: "draft", updated_at: new Date().toISOString() })
    .eq("id", input.prospectId);
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.MAIL_GENERATED,
    actorType: input.actorType ?? "human",
    actorId: input.actorId ?? "kopvast.nl",
    metadata: { mailId: created?.id, prompt: UNREACHABLE_SITE_PROMPT_VERSION, template: UNREACHABLE_SITE_TEMPLATE_VERSION },
  });
  return created?.id ?? null;
}

export async function ensureUnreachableSiteMail(
  prospectId: string,
  actorEmail: string,
  input?: { replaceDraft?: boolean }
) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  if (!detail.contact?.email) return { ok: false as const, message: "Voeg eerst een e-mailadres toe." };
  if (
    !isUnreachableProspect({
      status: detail.status,
      scanStatus: detail.scan?.status,
      scanError: detail.scan?.error_message,
    })
  ) {
    return { ok: false as const, message: "Deze mail is bedoeld als de website niet bereikbaar is." };
  }
  if (detail.mail && ["queued", "sent", "delivered"].includes(detail.mail.status)) {
    return { ok: true as const, mailId: detail.mail.id, existing: true };
  }
  if (detail.mail?.status === "draft" && !input?.replaceDraft) {
    return { ok: true as const, mailId: detail.mail.id, existing: true };
  }
  if (detail.mail?.status === "draft") {
    await supabase
      .from("email_messages")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", detail.mail.id)
      .eq("status", "draft");
  }
  const mailId = await storeUnreachableSiteMail(supabase, {
    prospectId,
    contactId: detail.contact.id,
    scanId: detail.scan?.id ?? null,
    companyName: detail.company_name,
    domain: detail.domain,
    actorType: "human",
    actorId: actorEmail,
  });
  if (!mailId) return { ok: false as const, message: "De mail klaarzetten is mislukt." };

  const { upsertDraft } = await import("@/lib/scout/leads");
  const { data: scoutLead } = await supabase
    .from("scout_leads")
    .select("id")
    .eq("prospect_id", prospectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (scoutLead?.id) {
    const generated = buildUnreachableSiteMail({
      domain: detail.domain,
      companyName: detail.company_name,
    });
    await upsertDraft(scoutLead.id, { subject: generated.subject, message: generated.body });
  }

  return { ok: true as const, mailId, existing: false };
}

async function cancelDraftMail(supabase: SupabaseClient, mailId: string) {
  await supabase
    .from("email_messages")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", mailId)
    .eq("status", "draft");
}

async function persistManualFindings(
  supabase: SupabaseClient,
  input: { prospectId: string; scanId?: string | null; findings: MailFinding[] }
) {
  const { error } = await supabase.from("findings").insert(
    input.findings.map((finding) => ({
      prospect_id: input.prospectId,
      scan_id: input.scanId ?? null,
      category: finding.category,
      finding_type: finding.finding_type,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      confidence: finding.confidence ?? 0.7,
      evidence_type: "manual",
      evidence_reference: "handmatig-bekeken",
      created_by: "system",
    }))
  );
  if (error) console.error("[kopvast] Handmatige findings opslaan mislukt", error.message);
}

async function syncScoutDraftFromMail(prospectId: string, subject: string, body: string) {
  const supabase = refreshClient();
  if (!supabase) return;
  const { upsertDraft } = await import("@/lib/scout/leads");
  const { data: scoutLead } = await supabase
    .from("scout_leads")
    .select("id")
    .eq("prospect_id", prospectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (scoutLead?.id) await upsertDraft(scoutLead.id, { subject, message: body });
}

export async function storeManualReasonsMail(
  supabase: SupabaseClient,
  input: {
    prospectId: string;
    contactId?: string | null;
    scanId?: string | null;
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
    place?: string | null;
    actorEmail: string;
  }
) {
  let place = input.place;
  if (place === undefined) {
    const { data: location } = await supabase
      .from("prospects")
      .select("city")
      .eq("id", input.prospectId)
      .maybeSingle();
    place = location?.city ?? null;
  }
  const generated = fallbackAcquisitionMail({
    companyName: input.companyName,
    domain: input.domain,
    fit: input.fit,
    findings: input.findings,
    place,
  });
  let html: string;
  let body = generated.body;
  try {
    const prepared = await prepareTrackedAcquisitionEmail({
      prospectId: input.prospectId,
      domain: input.domain,
      companyName: input.companyName,
      subject: generated.subject,
      body: generated.body,
    });
    html = prepared.html;
    body = prepared.text;
  } catch (error) {
    console.error("[kopvast] Handmatige acquisitiemail renderen mislukt", error instanceof Error ? error.message : error);
    return null;
  }

  const { data: contact } = input.contactId
    ? await supabase.from("prospect_contacts").select("id, email").eq("id", input.contactId).maybeSingle()
    : await supabase
        .from("prospect_contacts")
        .select("id, email")
        .eq("prospect_id", input.prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  const to = contact?.email || `draft@${input.domain}`;

  const { data: created, error } = await supabase
    .from("email_messages")
    .insert({
      prospect_id: input.prospectId,
      contact_id: contact?.id ?? input.contactId ?? null,
      scan_id: input.scanId ?? null,
      kind: "acquisition_outreach",
      to_email: to,
      intended_to_email: contact?.email ?? null,
      subject: generated.subject,
      body_text: body,
      body_html: html,
      status: "draft",
      email_mode: await getEmailMode(),
      template_version: generated.templateVersion,
      prompt_version: MANUAL_REASONS_PROMPT_VERSION,
      findings_used: generated.findingsUsed,
      provider: "resend",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[kopvast] Handmatige acquisitiemail opslaan mislukt", error.message);
    return null;
  }
  await prepareTrackedAcquisitionEmail({
    prospectId: input.prospectId,
    mailId: created.id,
    domain: input.domain,
    companyName: input.companyName,
    subject: generated.subject,
    body,
  }).catch(() => null);

  await supabase
    .from("prospects")
    .update({ mail_status: "draft", updated_at: new Date().toISOString() })
    .eq("id", input.prospectId);
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.MAIL_GENERATED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { mailId: created?.id, prompt: MANUAL_REASONS_PROMPT_VERSION, template: generated.templateVersion },
  });
  await syncScoutDraftFromMail(input.prospectId, generated.subject, body);
  return created?.id ?? null;
}

export async function generateManualReasonsMail(input: {
  prospectId: string;
  reasons: string[];
  actorEmail: string;
}) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const parsed = parseManualReasonCategories(input.reasons);
  if (!parsed.ok) return parsed;
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  if (!detail.contact?.email) return { ok: false as const, message: "Voeg eerst een e-mailadres toe." };
  if (detail.mail && ["queued", "sent", "delivered"].includes(detail.mail.status)) {
    return { ok: false as const, message: "Deze mail is al verzonden of staat in de wachtrij." };
  }
  if (detail.mail?.status === "draft") await cancelDraftMail(supabase, detail.mail.id);

  const findings = findingsFromManualReasons(parsed.categories);
  await persistManualFindings(supabase, {
    prospectId: detail.id,
    scanId: detail.scan?.id ?? null,
    findings,
  });

  const mailId = await storeManualReasonsMail(supabase, {
    prospectId: detail.id,
    contactId: detail.contact.id,
    scanId: detail.scan?.id ?? null,
    companyName: detail.company_name,
    domain: detail.domain,
    fit: detail.product_fit ?? "REVIEW_REQUIRED",
    findings,
    actorEmail: input.actorEmail,
  });
  if (!mailId) return { ok: false as const, message: "De mail klaarzetten is mislukt." };
  return { ok: true as const, mailId };
}

export async function generateAndSendManualReasonsMail(input: {
  prospectId: string;
  reasons: string[];
  actorEmail: string;
}) {
  const generated = await generateManualReasonsMail(input);
  if (!generated.ok) return generated;
  const sent = await sendProspectLiveMail({
    prospectId: input.prospectId,
    mailId: generated.mailId,
    actorEmail: input.actorEmail,
  });
  if (!sent.ok) {
    return {
      ok: false as const,
      message: `Mail is klaargezet, maar versturen lukte niet: ${sent.message}`,
      mailId: generated.mailId,
    };
  }
  return { ok: true as const, mailId: generated.mailId, sent: true as const };
}

export async function regenerateProspectMail(prospectId: string, actorEmail: string) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(prospectId);
  const failedScan = isUnreachableProspect({
    status: detail?.status,
    scanStatus: detail?.scan?.status,
    scanError: detail?.scan?.error_message,
  });
  if (failedScan && detail && (detail.findings.length || mailHasFindings(detail.mail))) {
    if (detail.mail?.status === "draft") await cancelDraftMail(supabase, detail.mail.id);
    const id = await storeManualReasonsMail(supabase, {
      prospectId,
      contactId: detail.contact?.id,
      scanId: detail.scan?.id ?? null,
      companyName: detail.company_name,
      domain: detail.domain,
      fit: detail.product_fit ?? "REVIEW_REQUIRED",
      findings: detail.findings.length ? detail.findings : (detail.mail?.findings_used as MailFinding[]) ?? [],
      actorEmail,
    });
    if (!id) return { ok: false as const, message: "Opnieuw genereren is mislukt." };
    return { ok: true as const };
  }
  if (failedScan) {
    return ensureUnreachableSiteMail(prospectId, actorEmail, { replaceDraft: true });
  }
  if (!detail?.scan) return { ok: false as const, message: "Er is nog geen scan om een mail op te baseren." };
  if (detail.mail?.status === "draft") {
    await supabase
      .from("email_messages")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", detail.mail.id)
      .eq("status", "draft");
  }
  const id = await storeGeneratedMail(supabase, {
    prospectId,
    contactId: detail.contact?.id,
    scanId: detail.scan.id,
    analysisId: detail.mail?.analysis_id,
    companyName: detail.company_name,
    domain: detail.domain,
    fit: detail.product_fit ?? "REVIEW_REQUIRED",
    findings: detail.findings,
    place: detail.city,
    actorType: "human",
    actorId: actorEmail,
  });
  if (!id) return { ok: false as const, message: "Opnieuw genereren is mislukt." };
  return { ok: true as const };
}

export async function saveProspectMailDraft(input: {
  prospectId: string;
  mailId: string;
  subject: string;
  body: string;
  actorEmail: string;
}) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) return { ok: false as const, message: "Onderwerp en tekst zijn verplicht." };

  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  const existing = detail.mails.find((item) => item.id === input.mailId);
  const shortFollowUp = isShortAcquisitionKind(existing?.kind);
  let html: string;
  let text = body;
  try {
    const prepared = shortFollowUp
      ? await prepareTrackedShortAcquisitionEmail({
          prospectId: input.prospectId,
          mailId: input.mailId,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
          offerPrice: followUpChoicePrice({ fit: detail.product_fit, place: detail.city }),
        })
      : await prepareTrackedAcquisitionEmail({
          prospectId: input.prospectId,
          mailId: input.mailId,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
        });
    html = prepared.html;
    text = shortFollowUp ? body : prepared.text;
  } catch (error) {
    return renderFailure(error);
  }
  const { error } = await supabase
    .from("email_messages")
    .update({
      subject,
      body_text: text,
      body_html: html,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.mailId)
    .eq("prospect_id", input.prospectId)
    .eq("status", "draft");
  if (error) return { ok: false as const, message: error.message };
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.MAIL_EDITED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { mailId: input.mailId },
  });
  return { ok: true as const };
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false as const, message: "RESEND_API_KEY ontbreekt." };
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    {
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    },
    { idempotencyKey: input.idempotencyKey }
  );
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, id: data?.id };
}

export async function sendProspectTestMail(input: { prospectId: string; mailId: string; actorEmail: string }) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  const mail = detail.mails.find((item) => item.id === input.mailId) ?? detail.mail;
  const issues = evaluatePreSend({ prospect: detail, mail, live: false }).filter(
    (item) => !["duplicate_send", "auto_blocked", "contact_rule"].includes(item.code)
  );
  if (issues.length) return { ok: false as const, message: issues[0].message };

  const to = await getTestEmail();
  const subject = mail!.subject!;
  const body = mail!.body_text!;
  const since = new Date(Date.now() - TEST_MAIL_IDEMPOTENCY_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("email_messages")
    .select("id")
    .eq("kind", "acquisition_test")
    .eq("prospect_id", detail.id)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (recent) return { ok: true as const, skippedDuplicate: true };

  let html: string;
  let text: string;
  const shortFollowUp = isShortAcquisitionKind(mail?.kind);
  try {
    const prepared = shortFollowUp
      ? await prepareTrackedShortAcquisitionEmail({
          prospectId: detail.id,
          mailId: mail!.id,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
          offerPrice: followUpChoicePrice({ fit: detail.product_fit, place: detail.city }),
        })
      : await prepareTrackedAcquisitionEmail({
          prospectId: detail.id,
          mailId: mail!.id,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
        });
    html = prepared.html;
    text = prepared.text;
  } catch (error) {
    return renderFailure(error);
  }
  const key = testMailIdempotencyKey(mail!.id);
  const sent = await sendViaResend({ to, subject: `[TEST] ${subject}`, html, text, idempotencyKey: key });
  if (!sent.ok) return sent;

  await supabase.from("email_messages").insert({
    prospect_id: detail.id,
    contact_id: detail.contact?.id ?? null,
    scan_id: mail!.scan_id,
    analysis_id: mail!.analysis_id,
    kind: "acquisition_test",
    to_email: to,
    intended_to_email: detail.contact?.email ?? null,
    subject: `[TEST] ${subject}`,
    body_text: body,
    body_html: html,
    status: "sent",
    email_mode: "TEST",
    resend_id: sent.id ?? null,
    idempotency_key: key,
    template_version: mail!.template_version,
    prompt_version: mail!.prompt_version,
    findings_used: mail!.findings_used ?? [],
    provider: "resend",
    sent_at: new Date().toISOString(),
    attempt_count: 1,
  });
  await supabase.from("cost_events").insert({
    prospect_id: detail.id,
    scan_id: mail!.scan_id,
    cost_type: "email",
    provider: "resend",
    amount: 0,
  });
  await refreshProspectCosts(supabase, detail.id);
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: ACTIVITY.TEST_MAIL_SENT,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { to, intended: detail.contact?.email, resendId: sent.id },
  });
  return { ok: true as const };
}

export async function sendProspectLiveMail(input: { prospectId: string; mailId: string; actorEmail: string }) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  const mail = detail.mails.find((item) => item.id === input.mailId) ?? detail.mail;
  const issues = evaluatePreSend({ prospect: detail, mail, live: true });
  if (issues.length) return { ok: false as const, message: issues[0].message };

  const intended = normalizeEmail(detail.contact!.email);
  const settings = await resolveEmailSettings();
  const recipient = recipientForMode(intended, settings.mode, settings.testEmail);
  const shortFollowUp = isShortAcquisitionKind(mail?.kind);
  const idempotencyKey = shortFollowUp ? `acquisition-manual/${mail!.id}` : `acquisition-outreach/${mail!.id}`;

  const { data: locked, error: lockError } = await supabase
    .from("email_messages")
    .update({
      status: "queued",
      queued_at: new Date().toISOString(),
      send_locked_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
      email_mode: recipient.mode,
      intended_to_email: intended,
      to_email: recipient.to,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mail!.id)
    .eq("status", "draft")
    .is("send_locked_at", null)
    .select("id")
    .maybeSingle();
  if (lockError) return { ok: false as const, message: lockError.message };
  if (!locked) return { ok: true as const, skippedDuplicate: true };

  if (!shortFollowUp) {
    await supabase.from("prospects").update({ mail_status: "queued", updated_at: new Date().toISOString() }).eq("id", detail.id);
  }
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: ACTIVITY.MAIL_QUEUED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { mailId: mail!.id, mode: recipient.mode, to: recipient.to },
  });

  const subject = mail!.subject!;
  const body = mail!.body_text!;
  let html: string;
  let text: string;
  try {
    const prepared = shortFollowUp
      ? await prepareTrackedShortAcquisitionEmail({
          prospectId: detail.id,
          mailId: mail!.id,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
          offerPrice: followUpChoicePrice({ fit: detail.product_fit, place: detail.city }),
        })
      : await prepareTrackedAcquisitionEmail({
          prospectId: detail.id,
          mailId: mail!.id,
          domain: detail.domain,
          companyName: detail.company_name,
          subject,
          body,
        });
    html = prepared.html;
    text = prepared.text;
  } catch (error) {
    const failed = renderFailure(error);
    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        last_error: failed.message,
        send_locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mail!.id);
    if (!shortFollowUp) await supabase.from("prospects").update({ mail_status: "failed" }).eq("id", detail.id);
    await logProspectActivity(supabase, {
      prospectId: detail.id,
      eventType: ACTIVITY.MAIL_FAILED,
      actorType: "system",
      metadata: { error: failed.message },
    });
    return failed;
  }
  const sent = await sendViaResend({
    to: recipient.to,
    subject,
    html,
    text,
    idempotencyKey,
  });

  if (!sent.ok) {
    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        last_error: sent.message,
        send_locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mail!.id);
    if (!shortFollowUp) await supabase.from("prospects").update({ mail_status: "failed" }).eq("id", detail.id);
    await logProspectActivity(supabase, {
      prospectId: detail.id,
      eventType: ACTIVITY.MAIL_FAILED,
      actorType: "system",
      metadata: { error: sent.message },
    });
    return sent;
  }

  const sentAt = new Date().toISOString();
  await supabase
    .from("email_messages")
    .update({
      status: "sent",
      sent_at: sentAt,
      resend_id: sent.id ?? null,
      last_error: null,
      attempt_count: 1,
      body_text: text,
      body_html: html,
      updated_at: sentAt,
    })
    .eq("id", mail!.id);
  await supabase
    .from("prospects")
    .update(
      shortFollowUp
        ? {
            last_contacted_at: sentAt,
            nurture_status: null,
            ...(detail.status === "CLOSED" ? {} : { outreach_paused: false }),
            updated_at: sentAt,
          }
        : {
            mail_status: "sent",
            last_contacted_at: sentAt,
            response_status: detail.response_status ?? "NO_RESPONSE",
            updated_at: sentAt,
          }
    )
    .eq("id", detail.id);
  await supabase.from("cost_events").insert({
    prospect_id: detail.id,
    scan_id: mail!.scan_id,
    cost_type: "email",
    provider: "resend",
    amount: 0,
  });
  await refreshProspectCosts(supabase, detail.id);
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: shortFollowUp ? ACTIVITY.MANUAL_FOLLOW_UP_SENT : ACTIVITY.MAIL_SENT,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: {
      mailId: mail!.id,
      subject,
      resendId: sent.id,
      mode: recipient.mode,
      to: recipient.to,
      intended,
      source: mail!.prompt_version ?? null,
    },
  });
  if (shortFollowUp) {
    await cancelPendingAutoFollowUp(detail.id, "manual_follow_up");
  } else if (mail!.kind === "acquisition_outreach") {
    await scheduleAutoFollowUp({ prospectId: detail.id, kind: mail!.kind, sentAt: new Date(sentAt) });
  }
  return { ok: true as const, mode: recipient.mode, to: recipient.to };
}

export async function applyAcquisitionWebhook(input: {
  providerEventId: string;
  emailId?: string;
  type: string;
  payload: unknown;
}) {
  const supabase = refreshClient();
  if (!supabase || !input.emailId) return false;

  const { data: existingEvent } = await supabase
    .from("email_events")
    .select("id")
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();
  if (existingEvent) return true;

  const { data: message } = await supabase
    .from("email_messages")
    .select("id, prospect_id, contact_id, kind, to_email, intended_to_email")
    .eq("resend_id", input.emailId)
    .maybeSingle();

  await supabase.from("email_events").insert({
    email_message_id: message?.id ?? null,
    resend_id: input.emailId,
    provider_event_id: input.providerEventId,
    event_type: input.type,
    payload: input.payload ?? {},
  });

  if (!message?.prospect_id) return Boolean(message);

  const now = new Date().toISOString();
  if (input.type === "email.delivered") {
    await supabase
      .from("email_messages")
      .update({ status: "delivered", delivered_at: now, updated_at: now })
      .eq("id", message.id);
    await supabase.from("prospects").update({ mail_status: "delivered", updated_at: now }).eq("id", message.prospect_id);
    await logProspectActivity(supabase, {
      prospectId: message.prospect_id,
      eventType: ACTIVITY.MAIL_DELIVERED,
      actorType: "webhook",
      metadata: { emailId: input.emailId },
    });
  }
  if (input.type === "email.bounced") {
    await supabase
      .from("email_messages")
      .update({ status: "bounced", failed_at: now, updated_at: now, last_error: "bounced" })
      .eq("id", message.id);
    await supabase.from("prospects").update({ mail_status: "bounced", updated_at: now }).eq("id", message.prospect_id);
    if (message.contact_id) {
      await supabase
        .from("prospect_contacts")
        .update({ email_verification_status: "BOUNCED", updated_at: now })
        .eq("id", message.contact_id);
    }
    await addSuppression(supabase, {
      email: message.intended_to_email || message.to_email,
      reason: "BOUNCED",
      source: "webhook",
    });
    await logProspectActivity(supabase, {
      prospectId: message.prospect_id,
      eventType: ACTIVITY.MAIL_BOUNCED,
      actorType: "webhook",
      metadata: { emailId: input.emailId },
    });
    await cancelPendingAutoFollowUp(message.prospect_id, "bounced");
  }
  if (input.type === "email.failed") {
    await supabase
      .from("email_messages")
      .update({ status: "failed", failed_at: now, updated_at: now, last_error: "failed" })
      .eq("id", message.id);
    await supabase.from("prospects").update({ mail_status: "failed", updated_at: now }).eq("id", message.prospect_id);
    await logProspectActivity(supabase, {
      prospectId: message.prospect_id,
      eventType: ACTIVITY.MAIL_FAILED,
      actorType: "webhook",
      metadata: { emailId: input.emailId },
    });
  }
  if (input.type === "email.complained") {
    await addSuppression(supabase, {
      email: message.intended_to_email || message.to_email,
      reason: "COMPLAINT",
      source: "webhook",
    });
    await supabase
      .from("prospects")
      .update({ do_not_contact: true, contact_status: "BLOCKED", auto_outreach_blocked: true, updated_at: now })
      .eq("id", message.prospect_id);
    if (message.contact_id) {
      await supabase
        .from("prospect_contacts")
        .update({ do_not_contact: true, contact_status: "BLOCKED", updated_at: now })
        .eq("id", message.contact_id);
    }
    await logProspectActivity(supabase, {
      prospectId: message.prospect_id,
      eventType: ACTIVITY.PROSPECT_BLOCKED,
      actorType: "webhook",
      metadata: { reason: "COMPLAINT", emailId: input.emailId },
    });
    await cancelPendingAutoFollowUp(message.prospect_id, "complaint");
  }
  return true;
}

export function fallbackMailForTests(input: Parameters<typeof fallbackAcquisitionMail>[0]) {
  return fallbackAcquisitionMail(input);
}

const FOLLOW_UP_LOCK_MS = 15 * 60 * 1000;

export async function processDueAutoFollowUps(limit = 4) {
  const supabase = refreshClient();
  if (!supabase) return [];
  const ids = await listDueAutoFollowUpIds(supabase, limit);
  const results = [];
  for (const prospectId of ids) {
    try {
      results.push(await sendAutomaticFollowUp(prospectId));
    } catch (error) {
      console.error("[kopvast] Automatische follow-up mislukt", error);
      results.push({
        ok: false as const,
        prospectId,
        message: error instanceof Error ? error.message : "Follow-up mislukt.",
      });
    }
  }
  return results;
}

export async function sendAutomaticFollowUp(prospectId: string) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, prospectId, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(prospectId);
  if (!detail) return { ok: false as const, prospectId, message: "Prospect niet gevonden." };

  const flags = await loadFollowUpCommercialFlags(detail.id, detail.inbound_lead_id);
  if ("error" in flags) return { ok: false as const, prospectId, message: flags.error, retry: true as const };
  const reason = followUpBlockReason(snapshotFromDetail(detail, flags));
  if (reason) {
    if (reason !== "already_sent") await cancelPendingAutoFollowUp(detail.id, reason);
    return { ok: true as const, prospectId, skipped: reason };
  }

  const key = autoFollowUpIdempotencyKey(detail.id);
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("email_messages")
    .select("id, status, send_locked_at")
    .eq("idempotency_key", key)
    .maybeSingle();

  let mailId = existing?.id ? String(existing.id) : "";
  if (existing && ["sent", "delivered"].includes(String(existing.status))) {
    await finishAutomaticFollowUp(detail, mailId, null);
    return { ok: true as const, prospectId, skippedDuplicate: true as const };
  }
  if (existing?.status === "queued" && existing.send_locked_at) {
    const age = Date.now() - new Date(String(existing.send_locked_at)).getTime();
    if (age < FOLLOW_UP_LOCK_MS) return { ok: true as const, prospectId, skippedDuplicate: true as const };
  }

  const settings = await resolveEmailSettings();
  const intended = detail.contact?.email ? normalizeEmail(detail.contact.email) : "";
  if (!intended) {
    await cancelPendingAutoFollowUp(detail.id, "missing_email");
    return { ok: true as const, prospectId, skipped: "missing_email" };
  }
  const recipient = recipientForMode(intended, settings.mode, settings.testEmail);
  const subject = `Nog even over ${detail.domain}`;
  const body = buildAutoFollowUpBody({ domain: detail.domain, fit: detail.product_fit, place: detail.city });

  if (!mailId) {
    const { data: created, error } = await supabase
      .from("email_messages")
      .insert({
        prospect_id: detail.id,
        contact_id: detail.contact?.id ?? null,
        scan_id: detail.scan?.id ?? null,
        kind: "acquisition_follow_up",
        to_email: recipient.to,
        intended_to_email: intended,
        subject,
        body_text: body,
        status: "queued",
        queued_at: now,
        send_locked_at: now,
        email_mode: recipient.mode,
        idempotency_key: key,
        template_version: AUTO_FOLLOW_UP_TEMPLATE_VERSION,
        prompt_version: AUTO_FOLLOW_UP_TEMPLATE_VERSION,
        findings_used: [],
        provider: "resend",
      })
      .select("id")
      .single();
    if (error || !created) {
      if (error && /duplicate|unique/i.test(error.message)) {
        return { ok: true as const, prospectId, skippedDuplicate: true as const };
      }
      return { ok: false as const, prospectId, message: error?.message || "Follow-up opslaan mislukt." };
    }
    mailId = String(created.id);
  } else {
    const { data: locked } = await supabase
      .from("email_messages")
      .update({ status: "queued", send_locked_at: now, updated_at: now, last_error: null })
      .eq("id", mailId)
      .in("status", ["queued", "failed", "draft"])
      .select("id")
      .maybeSingle();
    if (!locked) return { ok: true as const, prospectId, skippedDuplicate: true as const };
  }

  const fresh = await loadProspectDetail(detail.id);
  if (!fresh) return { ok: false as const, prospectId, message: "Prospect niet gevonden." };
  const freshFlags = await loadFollowUpCommercialFlags(fresh.id, fresh.inbound_lead_id);
  if ("error" in freshFlags) return { ok: false as const, prospectId, message: freshFlags.error, retry: true as const };
  const freshReason = followUpBlockReason(snapshotFromDetail(fresh, freshFlags));
  if (freshReason) {
    if (freshReason !== "already_sent") {
      await supabase
        .from("email_messages")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), send_locked_at: null, updated_at: new Date().toISOString() })
        .eq("id", mailId);
      await cancelPendingAutoFollowUp(fresh.id, freshReason);
    }
    return { ok: true as const, prospectId, skipped: freshReason };
  }

  let html: string;
  let text: string;
  try {
    const prepared = await prepareTrackedShortAcquisitionEmail({
      prospectId: fresh.id,
      mailId,
      domain: fresh.domain,
      companyName: fresh.company_name,
      subject,
      body,
      offerPrice: followUpChoicePrice({ fit: fresh.product_fit, place: fresh.city }),
    });
    html = prepared.html;
    text = prepared.text;
  } catch (error) {
    const failed = renderFailure(error);
    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        last_error: failed.message,
        send_locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mailId);
    return { ok: false as const, prospectId, message: failed.message };
  }

  const sent = await sendViaResend({ to: recipient.to, subject, html, text, idempotencyKey: key });
  if (!sent.ok) {
    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        last_error: sent.message,
        send_locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mailId);
    await logProspectActivity(supabase, {
      prospectId: fresh.id,
      eventType: ACTIVITY.MAIL_FAILED,
      actorType: "system",
      metadata: { error: sent.message, kind: "acquisition_follow_up" },
    });
    return { ok: false as const, prospectId, message: sent.message };
  }

  await supabase
    .from("email_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_id: sent.id ?? null,
      body_text: text,
      body_html: html,
      last_error: null,
      attempt_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mailId);
  await finishAutomaticFollowUp(fresh, mailId, sent.id ?? null);
  return { ok: true as const, prospectId, sent: true as const };
}

async function finishAutomaticFollowUp(detail: ProspectDetail, mailId: string, resendId: string | null) {
  const supabase = refreshClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  const stillQuiet = !detail.response_status || detail.response_status === "NO_RESPONSE";
  await supabase
    .from("prospects")
    .update({
      auto_follow_up_sent_at: now,
      last_contacted_at: now,
      ...(stillQuiet ? { response_status: "NO_RESPONSE" } : {}),
      ...(!detail.next_action?.trim() ? { next_action: "Kies handmatige opvolging, nurture of sluiten", next_action_at: now } : {}),
      updated_at: now,
    })
    .eq("id", detail.id)
    .is("auto_follow_up_sent_at", null);

  const { data: sentLog } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("prospect_id", detail.id)
    .eq("event_type", ACTIVITY.AUTO_FOLLOW_UP_SENT)
    .limit(1)
    .maybeSingle();
  if (!sentLog) {
    await logProspectActivity(supabase, {
      prospectId: detail.id,
      eventType: ACTIVITY.AUTO_FOLLOW_UP_SENT,
      actorType: "system",
      metadata: { mailId, resendId },
    });
    if (stillQuiet) {
      await logProspectActivity(supabase, {
        prospectId: detail.id,
        eventType: ACTIVITY.NO_RESPONSE_SET,
        actorType: "system",
        newStatus: "NO_RESPONSE",
        metadata: { mailId },
      });
    }
  }
}
