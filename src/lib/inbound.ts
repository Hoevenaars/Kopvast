import { refreshClient } from "@/lib/refresh";
import type { EmailStatus } from "@/lib/email-log";
import { defaultProductFitForSource, defaultStatusForSource } from "@/lib/aanvragen-model";
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

export function inboundType(source: string): "website" | "maatwerk" {
  return source === "maatwerk" ? "maatwerk" : "website";
}

export function mapInboundLead(lead: InboundLeadInput) {
  const domainLead = isDomainLandingSource(lead.source);
  const type = inboundType(lead.source);
  const status = defaultStatusForSource(lead.source, type);
  const productFit = defaultProductFitForSource(lead.source, type);
  const pages = lead.details["Pagina's"] || "";
  const hasBrand = lead.details.Merkstatus || "";
  const domain = domainLead ? parseDomainParam(lead.details.Domein || lead.website) || lead.website : "";
  const intent = domainLead ? parseDomainIntent(lead.details.Type) : null;
  const bid = domainLead ? parseBidAmount(lead.details.Bod ?? "") : { ok: true as const, amount: null };
  const wantsWebsite = domainLead ? lead.details["Website interesse"] === "Ja" : false;
  const requestDetail = domainLead
    ? lead.details.Type || "Domeininteresse"
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
    consent: true,
    source: lead.source || "kopvast",
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
      consent: true,
      status,
      product_fit: productFit,
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

export async function persistInboundLead(lead: InboundLeadInput): Promise<string | null> {
  const supabase = refreshClient();
  if (!supabase) {
    console.info("[kopvast] Inbound lead overgeslagen (geen Website Refresh-sleutel)");
    return null;
  }

  const row = mapInboundLead(lead);
  const first = await supabase.from("inbound_leads").insert(row).select("id").single();
  if (!first.error && first.data) return first.data.id as string;

  const { product_fit, ...legacy } = row;
  void product_fit;
  const retry = await supabase.from("inbound_leads").insert(legacy).select("id").single();
  if (!retry.error && retry.data) return retry.data.id as string;

  console.error("[kopvast] Inbound lead opslaan mislukt", first.error?.message || retry.error?.message);
  return null;
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
