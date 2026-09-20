import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { fromAddress } from "./email";
import { refreshClient } from "./refresh";
import { addSuppression } from "./suppression";
import { getEmailMode, getTestEmail, recipientForMode, resolveEmailSettings } from "./email-mode";
import { prepareAcquisitionEmail } from "./acquisition-render";
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
  nextStatusAfterLiveMail,
  type ProductFit,
} from "./acquisition-constants";
import { isEmail, normalizeEmail } from "./product";
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
  const unreachable =
    isUnreachableSiteMail(input.mail?.body_text) ||
    isUnreachableProspect({
      status: input.prospect.status,
      scanStatus: input.prospect.scan?.status,
      scanError: input.prospect.scan?.error_message,
    });
  if (input.mail && !input.mail.scan_id && !unreachable) {
    issues.push({ code: "missing_scan", message: "De mail is niet aan een scan gekoppeld." });
  }
  if (input.auto && !unreachable) {
    const used = input.mail?.findings_used;
    const hasFindings = Array.isArray(used) ? used.length > 0 : Boolean(used);
    if (input.mail && !hasFindings) {
      issues.push({ code: "missing_findings", message: "Er zijn geen gebruikte findings bij deze mail." });
    }
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
  try {
    const prepared = await prepareAcquisitionEmail(generated.emailProps);
    html = prepared.html;
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
      body_text: generated.body,
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
  try {
    html = (
      await prepareAcquisitionEmail({
        subject: generated.subject,
        body: generated.body,
        companyName: input.companyName,
        domain: input.domain,
      })
    ).html;
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
      body_text: generated.body,
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

export async function regenerateProspectMail(prospectId: string, actorEmail: string) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(prospectId);
  if (
    isUnreachableProspect({
      status: detail?.status,
      scanStatus: detail?.scan?.status,
      scanError: detail?.scan?.error_message,
    })
  ) {
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
  let html: string;
  try {
    html = (await prepareAcquisitionEmail({
      subject,
      body,
      companyName: detail.company_name ?? undefined,
      domain: detail.domain,
    })).html;
  } catch (error) {
    return renderFailure(error);
  }
  const { error } = await supabase
    .from("email_messages")
    .update({
      subject,
      body_text: body,
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
  try {
    const prepared = await prepareAcquisitionEmail({
      subject,
      body,
      companyName: detail.company_name ?? undefined,
      domain: detail.domain,
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
  const idempotencyKey = `acquisition-outreach/${mail!.id}`;

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
  if (!locked) {
    const contactedStatus = nextStatusAfterLiveMail(detail.status);
    if (contactedStatus && detail.status !== contactedStatus) {
      await supabase
        .from("prospects")
        .update({ status: contactedStatus, updated_at: new Date().toISOString() })
        .eq("id", detail.id);
    }
    await markScoutLeadsContacted(detail.id);
    return { ok: true as const, skippedDuplicate: true };
  }

  await supabase.from("prospects").update({ mail_status: "queued", updated_at: new Date().toISOString() }).eq("id", detail.id);
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
    const prepared = await prepareAcquisitionEmail({
      subject,
      body,
      companyName: detail.company_name ?? undefined,
      domain: detail.domain,
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", mail!.id);
    await supabase.from("prospects").update({ mail_status: "failed" }).eq("id", detail.id);
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", mail!.id);
    await supabase.from("prospects").update({ mail_status: "failed" }).eq("id", detail.id);
    await logProspectActivity(supabase, {
      prospectId: detail.id,
      eventType: ACTIVITY.MAIL_FAILED,
      actorType: "system",
      metadata: { error: sent.message },
    });
    return sent;
  }

  await supabase
    .from("email_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_id: sent.id ?? null,
      last_error: null,
      attempt_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mail!.id);
  const contactedStatus = nextStatusAfterLiveMail(detail.status);
  await supabase
    .from("prospects")
    .update({
      mail_status: "sent",
      last_contacted_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      response_status: detail.response_status ?? "NO_RESPONSE",
      ...(contactedStatus ? { status: contactedStatus } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", detail.id);
  await markScoutLeadsContacted(detail.id);
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
    eventType: ACTIVITY.MAIL_SENT,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { resendId: sent.id, mode: recipient.mode, to: recipient.to, intended },
  });
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
  }
  return true;
}

export async function markScoutLeadsContacted(prospectId: string) {
  const { markLeadContacted } = await import("@/lib/scout/leads");
  const supabase = refreshClient();
  if (!supabase) return;
  const { data } = await supabase.from("scout_leads").select("id").eq("prospect_id", prospectId);
  for (const row of data ?? []) {
    await markLeadContacted(String(row.id));
  }
}

export function fallbackMailForTests(input: Parameters<typeof fallbackAcquisitionMail>[0]) {
  return fallbackAcquisitionMail(input);
}
