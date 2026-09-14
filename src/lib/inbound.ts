import { refreshClient } from "@/lib/refresh";
import type { EmailStatus } from "@/lib/email-log";

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
  const type = inboundType(lead.source);
  const status = type === "maatwerk" ? "MAATWERK_REVIEW" : "NIEUW";
  const pages = lead.details["Pagina's"] || "";
  const hasBrand = lead.details.Merkstatus || "";
  const requestDetail = lead.details.Idee || lead.message || "";
  const functionality = lead.details.Functionaliteit || "";
  const scale = lead.details.Omvang || "";
  const timing = lead.details.Timing || "";

  return {
    type,
    status,
    company_name: lead.company || null,
    website: lead.website || null,
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
    source: "kopvast",
    payload: {
      id: lead.id,
      type,
      source: lead.source,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company_name: lead.company,
      website: lead.website,
      notes: lead.message,
      pages,
      has_brand: hasBrand,
      request_detail: requestDetail,
      functionality,
      scale,
      timing,
      consent: true,
      status,
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
  const { data, error } = await supabase.from("inbound_leads").insert(row).select("id").single();
  if (error || !data) {
    console.error("[kopvast] Inbound lead opslaan mislukt", error?.message);
    return null;
  }
  return data.id as string;
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
