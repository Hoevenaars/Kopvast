import { domainFromUrl } from "@/lib/acquire-map";
import { normalizeCompanyName, normalizeWebsiteHost } from "@/lib/customers";
import { isEmail, normalizeEmail } from "@/lib/product";
import { refreshClient } from "@/lib/refresh";

export type IdentityMatchReason = "prospect_id" | "token" | "email" | "domain" | "organization";

export type IdentityInput = {
  prospectId?: string | null;
  token?: string | null;
  email?: string | null;
  domain?: string | null;
  website?: string | null;
  organization?: string | null;
};

export type IdentityMatch =
  | { kind: "unique"; prospectId: string; reason: IdentityMatchReason }
  | { kind: "review"; candidates: Array<{ prospectId: string; company: string; reason: IdentityMatchReason }> }
  | { kind: "none" };

export function normalizeDomain(value: string | null | undefined): string | null {
  const host = normalizeWebsiteHost(value);
  if (host) return host;
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return domainFromUrl(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]?.toLowerCase() || null;
  }
}

export function normalizeEmailAddress(value: string | null | undefined): string | null {
  const email = value ? normalizeEmail(value) : "";
  return isEmail(email) ? email : null;
}

export function normalizeOrganization(value: string | null | undefined): string {
  return normalizeCompanyName(value);
}

export function sameDomain(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizeDomain(left);
  const b = normalizeDomain(right);
  return Boolean(a && b && a === b);
}

export async function resolveCommercialIdentity(input: IdentityInput): Promise<IdentityMatch> {
  const supabase = refreshClient();
  if (!supabase) return { kind: "none" };

  if (input.prospectId) {
    const { data } = await supabase.from("prospects").select("id").eq("id", input.prospectId).maybeSingle();
    if (data?.id) return { kind: "unique", prospectId: data.id as string, reason: "prospect_id" };
  }

  const token = input.token?.trim();
  if (token) {
    const { data } = await supabase
      .from("prospects")
      .select("id")
      .eq("public_check_token", token)
      .eq("is_archived", false)
      .maybeSingle();
    if (data?.id) return { kind: "unique", prospectId: data.id as string, reason: "token" };
  }

  const hits = new Map<string, { prospectId: string; company: string; reasons: IdentityMatchReason[] }>();

  function add(row: { id: string; company_name?: string | null }, reason: IdentityMatchReason) {
    const current = hits.get(row.id);
    if (current) {
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
      return;
    }
    hits.set(row.id, { prospectId: row.id, company: row.company_name || row.id, reasons: [reason] });
  }

  const email = normalizeEmailAddress(input.email);
  if (email) {
    const { data } = await supabase.from("prospect_contacts").select("prospect_id").ilike("email", email).limit(8);
    const ids = [...new Set((data ?? []).map((item) => String(item.prospect_id)).filter(Boolean))];
    if (ids.length) {
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id, company_name")
        .in("id", ids)
        .eq("is_archived", false);
      for (const row of prospects ?? []) add(row as { id: string; company_name?: string | null }, "email");
    }
  }

  const domain = normalizeDomain(input.domain || input.website);
  if (domain) {
    const { data } = await supabase
      .from("prospects")
      .select("id, company_name")
      .eq("is_archived", false)
      .ilike("domain", domain)
      .limit(8);
    for (const row of data ?? []) add(row as { id: string; company_name?: string | null }, "domain");
  }

  if (hits.size === 1) {
    const [match] = hits.values();
    const reason = (["email", "domain"] as const).find((item) => match.reasons.includes(item)) ?? match.reasons[0];
    return { kind: "unique", prospectId: match.prospectId, reason };
  }

  if (hits.size > 1) {
    return {
      kind: "review",
      candidates: [...hits.values()].map((item) => ({
        prospectId: item.prospectId,
        company: item.company,
        reason: item.reasons[0],
      })),
    };
  }

  const organization = normalizeOrganization(input.organization);
  if (organization) {
    const { data } = await supabase
      .from("prospects")
      .select("id, company_name")
      .eq("is_archived", false)
      .limit(40);
    const named = (data ?? []).filter((row) => normalizeOrganization(String(row.company_name ?? "")) === organization);
    if (named.length === 1) {
      return { kind: "unique", prospectId: named[0].id as string, reason: "organization" };
    }
    if (named.length > 1) {
      return {
        kind: "review",
        candidates: named.map((row) => ({
          prospectId: row.id as string,
          company: String(row.company_name ?? row.id),
          reason: "organization" as const,
        })),
      };
    }
  }

  return { kind: "none" };
}

export async function linkProspectAndRequest(input: {
  prospectId: string;
  requestId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = refreshClient();
  if (!supabase) return { ok: false, message: "Website Refresh is niet geconfigureerd." };

  const now = new Date().toISOString();
  const [{ error: leadError }, { error: prospectError }] = await Promise.all([
    supabase.from("inbound_leads").update({ prospect_id: input.prospectId, updated_at: now }).eq("id", input.requestId),
    supabase
      .from("prospects")
      .update({ inbound_lead_id: input.requestId, updated_at: now, last_activity_at: now })
      .eq("id", input.prospectId)
      .is("inbound_lead_id", null),
  ]);
  if (leadError) {
    console.error("[kopvast] Prospect-aanvraag koppelen mislukt", leadError.message);
    return { ok: false, message: "Koppelen is mislukt." };
  }
  if (prospectError) console.error("[kopvast] Prospect inbound_lead_id bijwerken mislukt", prospectError.message);
  return { ok: true };
}
