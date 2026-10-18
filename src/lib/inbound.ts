import { refreshClient } from "@/lib/refresh";
import type { EmailStatus } from "@/lib/email-log";
import { defaultProductFitForSource, defaultStatusForSource } from "@/lib/aanvragen-model";
import {
  interestContext,
  isPublicInterestSource,
  publicInterestNextAction,
  requestTypeForInterest,
} from "@/lib/interest";
import {
  DOMAIN_LANDING_SOURCE,
  isDomainLandingSource,
  parseBidAmount,
  parseDomainIntent,
  parseDomainParam,
} from "@/lib/domain-landing";

export type InboundLeadInput = {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string;
  message: string;
  source: string;
  phone: string;
  details: Record<string, string>;
};

export type InboundEmailKind = "internal_notification" | "customer_confirmation";

export function inboundType(source: string, details?: Record<string, string>): "website" | "maatwerk" {
  return requestTypeForInterest(source, details?.Dienst);
}

export function mapInboundLead(lead: InboundLeadInput) {
  const domainLead = isDomainLandingSource(lead.source);
  const type = inboundType(lead.source, lead.details);
  const status = defaultStatusForSource(lead.source, type);
  const productFit = defaultProductFitForSource(lead.source, type);
  const context = interestContext({ ...lead.details, website: lead.website });
  const nextAction = isPublicInterestSource(lead.source)
    ? publicInterestNextAction({ source: lead.source, subject: lead.details.Dienst })
    : null;
  const pages = lead.details["Pagina's"] || "";
  const hasBrand = lead.details.Merkstatus || "";
  const domain = domainLead ? parseDomainParam(lead.details.Domein || lead.website) || lead.website : "";
  const intent = domainLead ? parseDomainIntent(lead.details.Type) : null;
  const bid = domainLead ? parseBidAmount(lead.details.Bod ?? "") : { ok: true as const, amount: null };
  const wantsWebsite = domainLead ? lead.details["Website interesse"] === "Ja" : false;
  const requestDetail = domainLead
    ? lead.details.Type || "Domeininteresse"
    : context.dienstLabel
      ? [context.dienstLabel, lead.details.Toelichting || lead.message].filter(Boolean).join(" — ")
      : lead.details.Idee || lead.message || "";
  const functionality = domainLead ? lead.details.Bod || "" : lead.details.Functionaliteit || "";
  const scale = domainLead ? (wantsWebsite ? "website-interesse" : "") : lead.details.Omvang || "";
  const timing = lead.details.Timing || "";
  const website = domain || lead.website || "";
  const companyName = lead.company || (domainLead ? domain : "") || "";

  return {
    type,
    status,
    product_fit: productFit,
    company_name: companyName || null,
    website: website || null,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || null,
    pages: pages || null,
    has_brand: hasBrand || null,
    notes: lead.message || null,
    request_detail: requestDetail || null,
    functionality: functionality || null,
    scale: scale || null,
    timing: timing || null,
    consent: false,
    source: lead.source || "kopvast",
    ...(nextAction ? { next_action: nextAction, next_action_at: new Date().toISOString() } : {}),
    payload: {
      id: lead.id,
      type,
      source: lead.source,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company_name: companyName,
      website,
      notes: lead.message,
      pages,
      has_brand: hasBrand,
      request_detail: requestDetail,
      functionality,
      scale,
      timing,
      consent: false,
      status,
      product_fit: productFit,
      dienst: context.dienst,
      has_website: context.hasWebsite,
      landing: context.landing,
      cta: context.cta,
      utm_source: context.utmSource,
      utm_medium: context.utmMedium,
      utm_campaign: context.utmCampaign,
      ...(domainLead
        ? {
            domain,
            intent: intent ?? "price",
            bid_amount: bid.ok ? bid.amount : null,
            wants_website: wantsWebsite,
            source: DOMAIN_LANDING_SOURCE,
          }
        : {}),
    },
  };
}

export type PublicLeadSaveResult =
  | { ok: true; id: string; duplicate: boolean }
  | { ok: false; message: string };

function storeErrorCode(error: { code?: string; message?: string } | null | undefined) {
  return error?.code || "unknown";
}

function logStoreFailure(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message ?? "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  console.error("[kopvast] Aanvraag opslaan mislukt", {
    code: storeErrorCode(error),
    message: message.slice(0, 180),
  });
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || /duplicate key|idempotency_key/i.test(error?.message ?? "");
}

function isMissingColumn(error: { message?: string } | null | undefined, column: string) {
  return new RegExp(column, "i").test(error?.message ?? "") && /column|schema cache|does not exist/i.test(error?.message ?? "");
}

async function attachSavedLead(lead: InboundLeadInput, requestId: string) {
  const { attachInboundLeadToProspect } = await import("@/lib/commercial-handoffs");
  await attachInboundLeadToProspect({
    requestId,
    email: lead.email,
    website: lead.website,
    organization: lead.company,
    prospectId: typeof lead.details.prospect_id === "string" ? lead.details.prospect_id : null,
  });
}

export async function persistPublicInboundLead(
  lead: InboundLeadInput,
  idempotencyKey?: string | null
): Promise<PublicLeadSaveResult> {
  const supabase = refreshClient();
  if (!supabase) {
    return { ok: false, message: "Aanvraag opslaan lukt nu niet. Probeer het zo opnieuw." };
  }

  const mapped = mapInboundLead(lead);
  const key = idempotencyKey?.trim() || null;
  const withKey = key ? { ...mapped, idempotency_key: key } : mapped;
  const first = await supabase.from("inbound_leads").insert(withKey).select("id").single();
  if (!first.error && first.data?.id) {
    await attachSavedLead(lead, first.data.id as string);
    return { ok: true, id: first.data.id as string, duplicate: false };
  }

  if (key && isUniqueViolation(first.error)) {
    const existing = await supabase.from("inbound_leads").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing.data?.id) {
      await attachSavedLead(lead, existing.data.id as string);
      return { ok: true, id: existing.data.id as string, duplicate: true };
    }
  }

  const missingKey = key && isMissingColumn(first.error, "idempotency_key");
  const missingFit = isMissingColumn(first.error, "product_fit");
  if (missingKey || missingFit) {
    const { product_fit: _fit, ...legacy } = mapped;
    void _fit;
    const retry = await supabase.from("inbound_leads").insert(legacy).select("id").single();
    if (!retry.error && retry.data?.id) {
      await attachSavedLead(lead, retry.data.id as string);
      return { ok: true, id: retry.data.id as string, duplicate: false };
    }
    logStoreFailure(retry.error);
    return { ok: false, message: "Aanvraag opslaan lukt nu niet. Probeer het zo opnieuw." };
  }

  logStoreFailure(first.error);
  return { ok: false, message: "Aanvraag opslaan lukt nu niet. Probeer het zo opnieuw." };
}

export async function persistInboundLead(lead: InboundLeadInput, idempotencyKey?: string | null): Promise<string | null> {
  const saved = await persistPublicInboundLead(lead, idempotencyKey);
  return saved.ok ? saved.id : null;
}

export async function logInboundEmail(input: {
  leadId?: string;
  kind: InboundEmailKind;
  to: string;
  subject: string;
  status: EmailStatus;
  resendId?: string;
  error?: string;
}) {
  const supabase = refreshClient();
  if (!supabase || !input.leadId) return;

  const { error } = await supabase.from("email_messages").insert({
    lead_id: input.leadId,
    kind: input.kind,
    to_email: input.to,
    subject: input.subject,
    resend_id: input.resendId ?? null,
    status: input.status,
    attempt_count: 1,
    last_error: input.error ?? null,
  });
  if (error) {
    console.error("[kopvast] E-maillog in Website Refresh mislukt", error.message);
  }
}

export async function updateInboundEmailByResendId(resendId: string, status: EmailStatus, error?: string) {
  const supabase = refreshClient();
  if (!supabase) return false;

  const { data, error: updateError } = await supabase
    .from("email_messages")
    .update({
      status,
      last_error: error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("resend_id", resendId)
    .select("id");
  if (updateError) {
    console.error("[kopvast] E-mailstatus in Website Refresh bijwerken mislukt", updateError.message);
    return false;
  }
  return Boolean(data?.length);
}
