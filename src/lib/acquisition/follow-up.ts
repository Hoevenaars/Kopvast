import type { SupabaseClient } from "@supabase/supabase-js";
import { MORE_INFO_CTA_LABEL, PROPOSAL_CTA_LABEL } from "@/emails/acquisition-outreach-copy";
import { logProspectActivity } from "@/lib/acquisition-activity";
import { ACTIVITY, FINDING_CATEGORY_LABELS, type ProductFit } from "@/lib/acquisition-constants";
import { explainOutreachOffer } from "@/lib/acquisition/outreach-policy";
import { loadProspectDetail, type DashboardAction, type ProspectDetail } from "@/lib/acquisition";
import { addSuppression } from "@/lib/suppression";
import { getEmailMode } from "@/lib/email-mode";
import { refreshClient } from "@/lib/refresh";
import { products } from "@/lib/site";

export const AUTO_FOLLOW_UP_TEMPLATE_VERSION = "acquisition-follow-up-v1";
export const MANUAL_FOLLOW_UP_TEMPLATE_VERSION = "acquisition-manual-follow-up-v1";
export const NURTURE_MAIL_TEMPLATE_VERSION = "acquisition-nurture-outreach-v1";
export const AUTO_FOLLOW_UP_BUSINESS_DAYS = 4;

export const SHORT_ACQUISITION_KINDS = ["acquisition_follow_up", "acquisition_manual_follow_up"] as const;

export function isShortAcquisitionKind(kind: string | null | undefined) {
  return kind === "acquisition_follow_up" || kind === "acquisition_manual_follow_up";
}

export function autoFollowUpIdempotencyKey(prospectId: string) {
  return `acquisition-follow-up/${prospectId}`;
}

export const nurturePresets = [
  { value: "2w", label: "2 weken" },
  { value: "4w", label: "4 weken" },
  { value: "6w", label: "6 weken" },
  { value: "3m", label: "3 maanden" },
  { value: "6m", label: "6 maanden" },
  { value: "custom", label: "Eigen datum" },
] as const;

export type NurturePreset = (typeof nurturePresets)[number]["value"];

export const nurtureReasons = [
  { value: "NO_RESPONSE", label: "Geen reactie" },
  { value: "NOT_NOW", label: "Nu niet" },
  { value: "BUDGET_LATER", label: "Budget later" },
  { value: "PROJECT_DELAYED", label: "Project uitgesteld" },
  { value: "EXISTING_CONTRACT", label: "Lopend contract" },
  { value: "TIMING_UNKNOWN", label: "Timing niet goed" },
  { value: "MANUAL", label: "Handmatig" },
  { value: "OTHER", label: "Anders" },
] as const;

export type NurtureReason = (typeof nurtureReasons)[number]["value"];

export const FOLLOW_UP_ACTIVITY_LABELS: Record<string, string> = {
  AUTO_FOLLOW_UP_SCHEDULED: "Automatische follow-up gepland",
  AUTO_FOLLOW_UP_SENT: "Automatische follow-up verzonden",
  AUTO_FOLLOW_UP_CANCELLED: "Automatische follow-up geannuleerd",
  NO_RESPONSE_SET: "Geen reactie na follow-up",
  MANUAL_FOLLOW_UP_SENT: "Handmatige follow-up verzonden",
  NURTURE_SCHEDULED: "Later opnieuw benaderen",
  NURTURE_DUE: "Opnieuw benaderen",
  NURTURE_POSTPONED: "Opnieuw benaderen uitgesteld",
  PROSPECT_CLOSED: "Prospect gesloten",
  PROSPECT_BLOCKED: "Niet meer benaderen",
};

const BLOCKING_RESPONSES = new Set(["POSITIVE", "QUESTION", "MEETING", "NOT_INTERESTED", "UNSUBSCRIBED"]);
const BLOCKING_STAGES = new Set(["ENGAGED", "REQUESTED", "QUALIFIED", "PROPOSAL", "WON", "CUSTOMER"]);
const CLOSED_STATUSES = new Set(["CLOSED", "CONVERTED", "ARCHIVED", "REJECTED"]);

export type FollowUpSnapshot = {
  responseStatus: string | null;
  commercialIntent: string | null;
  commercialStage: string | null;
  status: string;
  isArchived: boolean;
  doNotContact: boolean;
  contactDoNotContact: boolean;
  contactStatus: string;
  autoOutreachBlocked: boolean;
  outreachPaused: boolean;
  mailStatus: string;
  contactVerification: string | null;
  suppressionReason: string | null;
  hasRequest: boolean;
  hasProposal: boolean;
  hasCustomer: boolean;
  nurtureStatus: string | null;
  alreadySent: boolean;
};

export function addBusinessDays(from: Date, days: number) {
  const result = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return result;
}

export function canScheduleAutoFollowUp(input: {
  kind: string;
  dueAt?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
}) {
  return input.kind === "acquisition_outreach" && !input.dueAt && !input.sentAt && !input.cancelledAt;
}

export function isNurtureReason(value: string): value is NurtureReason {
  return nurtureReasons.some((item) => item.value === value);
}

export function labelForNurtureReason(value: string | null | undefined) {
  return nurtureReasons.find((item) => item.value === value)?.label ?? value ?? "Later benaderen";
}

export function nurtureUntilFromChoice(choice: string, customDate: string | null, now = new Date()) {
  const base = new Date(now.getTime());
  if (choice === "2w") base.setUTCDate(base.getUTCDate() + 14);
  else if (choice === "4w") base.setUTCDate(base.getUTCDate() + 28);
  else if (choice === "6w") base.setUTCDate(base.getUTCDate() + 42);
  else if (choice === "3m") base.setUTCMonth(base.getUTCMonth() + 3);
  else if (choice === "6m") base.setUTCMonth(base.getUTCMonth() + 6);
  else if (choice === "custom") {
    if (!customDate || !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) return null;
    const [year, month, day] = customDate.split("-").map(Number);
    const picked = new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
    if (Number.isNaN(picked.getTime()) || picked.getTime() <= now.getTime()) return null;
    return picked.toISOString();
  } else return null;
  return base.toISOString();
}

export function followUpOfferSentence(input: { fit: ProductFit | null; place?: string | null }) {
  const view = explainOutreachOffer({ fit: input.fit, place: input.place });
  if (!input.fit || input.fit === "NOT_FIT" || input.fit === "REVIEW_REQUIRED") return null;
  if (input.fit === "CUSTOM_FIT") {
    return "Voor jullie denk ik nog steeds aan maatwerk, passend bij wat de website nodig heeft.";
  }
  if (view.eligible) return "Voor jullie staat mijn aanbod van €995 excl. btw. nog steeds.";
  return `Voor jullie staat mijn aanbod van ${products.website.price} excl. btw. nog steeds.`;
}

export function followUpChoicePrice(input: { fit: ProductFit | null; place?: string | null }): 995 | 1495 | null {
  if (input.fit !== "STANDARD_FIT") return null;
  return explainOutreachOffer(input).eligible ? 995 : 1495;
}

export function buildAutoFollowUpBody(input: { domain: string; fit: ProductFit | null; place?: string | null }) {
  const offer = followUpOfferSentence(input);
  return [
    "Goedendag,",
    "",
    `Ik stuur mijn mail over ${input.domain} nog één keer naar boven.`,
    "",
    "Ik zie nog steeds voldoende aanknopingspunten om hier iets sterkers van te maken.",
    "",
    ...(offer ? [offer, ""] : []),
    PROPOSAL_CTA_LABEL,
    "",
    MORE_INFO_CTA_LABEL,
    "",
    "Als het nu niet speelt, ook helemaal prima.",
  ].join("\n");
}

export function buildManualFollowUpBody(input: { companyName?: string | null; domain: string }) {
  const who = input.companyName?.trim() || input.domain;
  return [
    "Goedendag,",
    "",
    `Ik wilde hier toch nog één keer persoonlijk op terugkomen over ${who}.`,
    "",
    "Ik denk namelijk dat er bij jullie echt iets moois van te maken is.",
    "",
    "Mocht het interessant zijn, dan maak ik met plezier een concreet voorstel.",
    "",
    "Als het nu niet speelt, is dat uiteraard ook prima.",
    "",
    PROPOSAL_CTA_LABEL,
    "",
    MORE_INFO_CTA_LABEL,
  ].join("\n");
}

export function buildNurtureOutreachBody(input: {
  companyName?: string | null;
  domain: string;
  reason?: string | null;
  note?: string | null;
  finding?: string | null;
}) {
  const who = input.companyName?.trim() || input.domain;
  const reason = labelForNurtureReason(input.reason);
  const finding = input.finding?.trim();
  return [
    "Goedendag,",
    "",
    `Ik kom nog een keer terug op ${who}.`,
    "",
    input.reason ? `De vorige keer noteerde ik: ${reason.toLowerCase()}.` : "De vorige keer was het moment er niet.",
    "",
    finding ? `Wat ik nu zie: ${finding}` : "Ik denk nog steeds dat hier iets sterkers van te maken is.",
    "",
    input.note?.trim() ? input.note.trim() : "Mocht het interessant zijn, dan maak ik met plezier een concreet voorstel.",
    "",
    "Als het nu niet speelt, is dat uiteraard ook prima.",
    "",
    PROPOSAL_CTA_LABEL,
    "",
    MORE_INFO_CTA_LABEL,
  ].join("\n");
}

export { followUpPlainText } from "@/lib/acquisition/follow-up-copy";

export function nurtureIsDue(status: string | null, until: string | null, now = new Date()) {
  if (status === "DUE") return true;
  if (status !== "SCHEDULED" || !until) return false;
  return new Date(until).getTime() <= now.getTime();
}

export function followUpBlockReason(snapshot: FollowUpSnapshot) {
  if (snapshot.alreadySent) return "already_sent";
  if (snapshot.isArchived || CLOSED_STATUSES.has(snapshot.status)) return "closed";
  if (snapshot.doNotContact || snapshot.contactDoNotContact) return "do_not_contact";
  if (snapshot.contactStatus === "DO_NOT_CONTACT" || snapshot.contactStatus === "BLOCKED") return "contact_blocked";
  if (snapshot.suppressionReason) return `suppressed:${snapshot.suppressionReason}`;
  if (snapshot.mailStatus === "bounced" || snapshot.contactVerification === "BOUNCED") return "bounced";
  if (snapshot.autoOutreachBlocked || snapshot.outreachPaused) return "paused";
  if (snapshot.nurtureStatus === "SCHEDULED" || snapshot.nurtureStatus === "DUE") return "nurture";
  if (snapshot.responseStatus && BLOCKING_RESPONSES.has(snapshot.responseStatus)) return "responded";
  if (snapshot.commercialIntent === "MORE_INFO" || snapshot.commercialIntent === "PROPOSAL") return "intent";
  if (snapshot.commercialStage && BLOCKING_STAGES.has(snapshot.commercialStage)) return "commercial_stage";
  if (snapshot.hasRequest) return "request";
  if (snapshot.hasProposal) return "proposal";
  if (snapshot.hasCustomer) return "customer";
  return null;
}

export function showNoResponseChoices(input: {
  autoFollowUpSentAt: string | null;
  responseStatus: string | null;
  commercialIntent: string | null;
  commercialStage: string | null;
  doNotContact: boolean;
  status: string;
  nurtureStatus: string | null;
  blocked: boolean;
}) {
  if (input.blocked || input.doNotContact) return false;
  if (!input.autoFollowUpSentAt) return false;
  if (input.responseStatus && input.responseStatus !== "NO_RESPONSE") return false;
  if (input.commercialIntent === "MORE_INFO" || input.commercialIntent === "PROPOSAL") return false;
  if (input.commercialStage && input.commercialStage !== "PROSPECT") return false;
  if (CLOSED_STATUSES.has(input.status)) return false;
  if (input.nurtureStatus === "SCHEDULED" || input.nurtureStatus === "DUE") return false;
  return true;
}

export function showNurtureReview(input: { nurtureStatus: string | null; blocked: boolean }) {
  return input.nurtureStatus === "DUE" && !input.blocked;
}

export type ScanChangeSummary = {
  changed: string[];
  same: string[];
  angle: string;
  scoreLine: string | null;
};

export function summarizeScanChanges(input: {
  previousFindings: Array<{ title: string; category: string }>;
  nextFindings: Array<{ title: string; category: string }>;
  previousScore: number | null;
  nextScore: number | null;
}): ScanChangeSummary {
  const label = (category: string) => FINDING_CATEGORY_LABELS[category] || category;
  const previous = new Set(input.previousFindings.map((item) => item.category));
  const next = new Set(input.nextFindings.map((item) => item.category));
  const changed = [...next].filter((item) => !previous.has(item)).map(label);
  const removed = [...previous].filter((item) => !next.has(item)).map(label);
  const same = [...next].filter((item) => previous.has(item)).map(label);
  const scoreLine =
    input.previousScore != null && input.nextScore != null
      ? `Score ${Math.round(input.previousScore)} → ${Math.round(input.nextScore)}`
      : null;
  const angle = changed.length
    ? `Nieuwe invalshoek: ${changed[0]}.`
    : removed.length
      ? `Niet meer zichtbaar: ${removed[0]}.`
      : same.length
        ? `De kern is hetzelfde: ${same[0]}.`
        : "Geen duidelijke nieuwe bevindingen.";
  return { changed: [...changed, ...removed.map((item) => `niet meer: ${item}`)], same, angle, scoreLine };
}

export function contactedAgo(iso: string | null, now = Date.now()) {
  if (!iso) return "nog niet benaderd";
  const days = Math.max(0, Math.round((now - new Date(iso).getTime()) / 86_400_000));
  if (days < 1) return "vandaag voor het laatst benaderd";
  if (days < 14) return `${days} dagen geleden voor het laatst benaderd`;
  const weeks = Math.round(days / 7);
  return `${weeks} weken geleden voor het laatst benaderd`;
}

export function snapshotFromDetail(
  detail: ProspectDetail,
  extra: { hasProposal: boolean; hasCustomer: boolean }
): FollowUpSnapshot {
  return {
    responseStatus: detail.response_status,
    commercialIntent: detail.commercial_intent,
    commercialStage: detail.commercial_stage,
    status: detail.status,
    isArchived: detail.is_archived,
    doNotContact: detail.do_not_contact,
    contactDoNotContact: Boolean(detail.contact?.do_not_contact),
    contactStatus: detail.contact_status,
    autoOutreachBlocked: detail.auto_outreach_blocked,
    outreachPaused: detail.outreach_paused,
    mailStatus: detail.mail_status,
    contactVerification: detail.contact?.email_verification_status ?? null,
    suppressionReason: detail.suppression?.reason ?? null,
    hasRequest: Boolean(detail.inbound_lead_id),
    hasProposal: extra.hasProposal,
    hasCustomer: extra.hasCustomer,
    nurtureStatus: detail.nurture_status,
    alreadySent: Boolean(detail.auto_follow_up_sent_at),
  };
}

async function commercialFlags(prospectId: string, inboundLeadId: string | null) {
  const supabase = refreshClient();
  if (!supabase) return { error: "Website Refresh is niet geconfigureerd." as const };
  const proposal = supabase.from("proposals").select("id").eq("prospect_id", prospectId).limit(1);
  const leadProposal = inboundLeadId
    ? supabase.from("proposals").select("id").eq("inbound_lead_id", inboundLeadId).limit(1)
    : Promise.resolve({ data: [], error: null });
  const customer = supabase.from("kopvast_organizations").select("id").eq("prospect_id", prospectId).limit(1);
  const [proposalRes, leadProposalRes, customerRes] = await Promise.all([proposal, leadProposal, customer]);
  if (proposalRes.error || leadProposalRes.error || customerRes.error) {
    return { error: proposalRes.error?.message || leadProposalRes.error?.message || customerRes.error?.message || "Controle mislukt." };
  }
  return {
    hasProposal: Boolean(proposalRes.data?.length || leadProposalRes.data?.length),
    hasCustomer: Boolean(customerRes.data?.length),
  };
}

export async function cancelPendingAutoFollowUp(prospectId: string, reason: string) {
  const supabase = refreshClient();
  if (!supabase || !prospectId) return false;
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("prospects")
    .update({
      auto_follow_up_due_at: null,
      auto_follow_up_cancelled_at: now,
      updated_at: now,
    })
    .eq("id", prospectId)
    .is("auto_follow_up_sent_at", null)
    .is("auto_follow_up_cancelled_at", null)
    .not("auto_follow_up_due_at", "is", null)
    .select("id")
    .maybeSingle();
  if (!data) return false;
  await supabase
    .from("email_messages")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("prospect_id", prospectId)
    .eq("kind", "acquisition_follow_up")
    .in("status", ["draft", "queued"]);
  await logProspectActivity(supabase, {
    prospectId,
    eventType: ACTIVITY.AUTO_FOLLOW_UP_CANCELLED,
    actorType: "system",
    metadata: { reason },
  });
  return true;
}

export async function scheduleAutoFollowUp(input: { prospectId: string; kind: string; sentAt?: Date }) {
  if (input.kind !== "acquisition_outreach") return { scheduled: false as const };
  const supabase = refreshClient();
  if (!supabase) return { scheduled: false as const };
  const { data } = await supabase
    .from("prospects")
    .select("auto_follow_up_due_at, auto_follow_up_sent_at, auto_follow_up_cancelled_at")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (
    !data ||
    !canScheduleAutoFollowUp({
      kind: input.kind,
      dueAt: data.auto_follow_up_due_at,
      sentAt: data.auto_follow_up_sent_at,
      cancelledAt: data.auto_follow_up_cancelled_at,
    })
  ) {
    return { scheduled: false as const };
  }
  const dueAt = addBusinessDays(input.sentAt ?? new Date(), AUTO_FOLLOW_UP_BUSINESS_DAYS).toISOString();
  const { data: updated } = await supabase
    .from("prospects")
    .update({ auto_follow_up_due_at: dueAt, updated_at: new Date().toISOString() })
    .eq("id", input.prospectId)
    .is("auto_follow_up_due_at", null)
    .is("auto_follow_up_sent_at", null)
    .is("auto_follow_up_cancelled_at", null)
    .select("id")
    .maybeSingle();
  if (!updated) return { scheduled: false as const };
  await logProspectActivity(supabase, {
    prospectId: input.prospectId,
    eventType: ACTIVITY.AUTO_FOLLOW_UP_SCHEDULED,
    actorType: "system",
    metadata: { dueAt },
  });
  return { scheduled: true as const, dueAt };
}

function outreachBlocked(detail: ProspectDetail) {
  return (
    detail.do_not_contact ||
    detail.contact_status === "DO_NOT_CONTACT" ||
    detail.contact_status === "BLOCKED" ||
    Boolean(detail.contact?.do_not_contact) ||
    Boolean(detail.suppression)
  );
}

export async function createManualFollowUpDraft(input: {
  prospectId: string;
  actorEmail: string;
  source: "manual" | "nurture";
}) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  if (outreachBlocked(detail)) return { ok: false as const, message: "Dit contact mag niet benaderd worden." };
  if (!detail.contact?.email) return { ok: false as const, message: "Er is geen e-mailadres gekoppeld." };

  const { data: existing } = await supabase
    .from("email_messages")
    .select("id")
    .eq("prospect_id", detail.id)
    .eq("kind", "acquisition_manual_follow_up")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true as const, mailId: String(existing.id) };

  const finding = detail.findings[0]?.title ?? null;
  const body =
    input.source === "nurture"
      ? buildNurtureOutreachBody({
          companyName: detail.company_name,
          domain: detail.domain,
          reason: detail.nurture_reason,
          note: detail.nurture_note,
          finding,
        })
      : buildManualFollowUpBody({ companyName: detail.company_name, domain: detail.domain });
  const subject = input.source === "nurture" ? `Terugkomen op ${detail.domain}` : `Nog één keer over ${detail.domain}`;
  const { data: created, error } = await supabase
    .from("email_messages")
    .insert({
      prospect_id: detail.id,
      contact_id: detail.contact.id,
      scan_id: detail.scan?.id ?? null,
      kind: "acquisition_manual_follow_up",
      to_email: detail.contact.email,
      intended_to_email: detail.contact.email,
      subject,
      body_text: body,
      status: "draft",
      email_mode: await getEmailMode(),
      template_version: input.source === "nurture" ? NURTURE_MAIL_TEMPLATE_VERSION : MANUAL_FOLLOW_UP_TEMPLATE_VERSION,
      prompt_version: input.source,
      findings_used: [],
      provider: "resend",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, message: error?.message || "Concept aanmaken is mislukt." };
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: ACTIVITY.MAIL_GENERATED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { mailId: created.id, source: input.source, template: input.source },
  });
  return { ok: true as const, mailId: String(created.id) };
}

export async function scheduleProspectNurture(input: {
  prospectId: string;
  preset: string;
  customDate?: string | null;
  reason: string;
  note?: string | null;
  actorEmail: string;
  postponed?: boolean;
}) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  if (outreachBlocked(detail)) return { ok: false as const, message: "Dit contact mag niet benaderd worden." };
  if (!isNurtureReason(input.reason)) return { ok: false as const, message: "Kies een reden." };
  const until = nurtureUntilFromChoice(input.preset, input.customDate ?? null);
  if (!until) return { ok: false as const, message: "Kies een datum in de toekomst." };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("prospects")
    .update({
      nurture_status: "SCHEDULED",
      nurture_until: until,
      nurture_reason: input.reason,
      nurture_note: input.note?.trim() || null,
      outreach_paused: true,
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", detail.id);
  if (error) return { ok: false as const, message: error.message };
  await cancelPendingAutoFollowUp(detail.id, "nurture");
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: input.postponed ? "NURTURE_POSTPONED" : "NURTURE_SCHEDULED",
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { until, reason: input.reason, note: input.note?.trim() || null },
  });
  return { ok: true as const, until };
}

export async function closeProspectCommercial(input: { prospectId: string; actorEmail: string }) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("prospects")
    .update({
      status: "CLOSED",
      outreach_paused: true,
      nurture_status: null,
      nurture_until: null,
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", detail.id);
  if (error) return { ok: false as const, message: error.message };
  await cancelPendingAutoFollowUp(detail.id, "closed");
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: "PROSPECT_CLOSED",
    actorType: "human",
    actorId: input.actorEmail,
    oldStatus: detail.status,
    newStatus: "CLOSED",
  });
  return { ok: true as const };
}

export async function blockProspectOutreach(input: { prospectId: string; actorEmail: string }) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet geconfigureerd." };
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return { ok: false as const, message: "Prospect niet gevonden." };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("prospects")
    .update({
      do_not_contact: true,
      contact_status: "DO_NOT_CONTACT",
      auto_outreach_blocked: true,
      outreach_paused: true,
      nurture_status: null,
      nurture_until: null,
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", detail.id);
  if (error) return { ok: false as const, message: error.message };
  await supabase
    .from("prospect_contacts")
    .update({ do_not_contact: true, contact_status: "DO_NOT_CONTACT", updated_at: now })
    .eq("prospect_id", detail.id);
  if (detail.contact?.email) {
    await addSuppression(supabase, {
      email: detail.contact.email,
      reason: "MANUAL_BLOCK",
      source: "admin",
    });
  }
  await cancelPendingAutoFollowUp(detail.id, "do_not_contact");
  await logProspectActivity(supabase, {
    prospectId: detail.id,
    eventType: ACTIVITY.PROSPECT_BLOCKED,
    actorType: "human",
    actorId: input.actorEmail,
    metadata: { reason: "MANUAL_BLOCK" },
  });
  return { ok: true as const };
}

export async function markDueNurtures(limit = 20) {
  const supabase = refreshClient();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("prospects")
    .select("id, do_not_contact, status, contact_status")
    .eq("nurture_status", "SCHEDULED")
    .lte("nurture_until", now)
    .eq("is_archived", false)
    .order("nurture_until", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[kopvast] Nurture laden mislukt", error.message);
    return [];
  }
  const due: string[] = [];
  for (const row of data ?? []) {
    const blocked =
      row.do_not_contact ||
      row.contact_status === "DO_NOT_CONTACT" ||
      row.contact_status === "BLOCKED" ||
      row.status === "CLOSED" ||
      row.status === "CONVERTED" ||
      row.status === "ARCHIVED";
    if (blocked) {
      await supabase
        .from("prospects")
        .update({ nurture_status: null, nurture_until: null, outreach_paused: true, updated_at: now })
        .eq("id", row.id)
        .eq("nurture_status", "SCHEDULED");
      continue;
    }
    const { data: updated } = await supabase
      .from("prospects")
      .update({ nurture_status: "DUE", updated_at: now, last_activity_at: now })
      .eq("id", row.id)
      .eq("nurture_status", "SCHEDULED")
      .select("id")
      .maybeSingle();
    if (!updated) continue;
    await logProspectActivity(supabase, {
      prospectId: String(row.id),
      eventType: "NURTURE_DUE",
      actorType: "system",
      metadata: { humanReview: true },
    });
    due.push(String(row.id));
  }
  return due;
}

export async function loadNurtureTodayActions(): Promise<DashboardAction[]> {
  const supabase = refreshClient();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const columns = "id, company_name, domain, last_contacted_at, nurture_reason, nurture_status";
  const [due, scheduled] = await Promise.all([
    supabase
      .from("prospects")
      .select(columns)
      .eq("nurture_status", "DUE")
      .eq("is_archived", false)
      .eq("do_not_contact", false)
      .limit(8),
    supabase
      .from("prospects")
      .select(columns)
      .eq("nurture_status", "SCHEDULED")
      .lte("nurture_until", now)
      .eq("is_archived", false)
      .eq("do_not_contact", false)
      .limit(8),
  ]);
  const rows = [...(due.data ?? []), ...(scheduled.data ?? [])] as Array<{
    id: string;
    company_name: string | null;
    domain: string;
    last_contacted_at: string | null;
    nurture_reason: string | null;
  }>;
  const seen = new Set<string>();
  const actions: DashboardAction[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    actions.push({
      title: "Opnieuw benaderen",
      company: row.company_name || row.domain,
      status: labelForNurtureReason(row.nurture_reason),
      age: contactedAgo(row.last_contacted_at),
      href: `/admin/acquisitie/${row.id}?beoordelen=1`,
    });
  }
  return actions;
}

export async function loadFollowUpCommercialFlags(prospectId: string, inboundLeadId: string | null) {
  return commercialFlags(prospectId, inboundLeadId);
}

export async function listDueAutoFollowUpIds(supabase: SupabaseClient, limit: number) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("prospects")
    .select("id")
    .lte("auto_follow_up_due_at", now)
    .is("auto_follow_up_sent_at", null)
    .is("auto_follow_up_cancelled_at", null)
    .eq("is_archived", false)
    .order("auto_follow_up_due_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[kopvast] Follow-up wachtrij laden mislukt", error.message);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}
