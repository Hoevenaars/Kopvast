import type { SupabaseClient } from "@supabase/supabase-js";
import { isEmail, normalizeEmail } from "./product";
import type { SuppressionReason } from "./acquisition-constants";

export type SuppressionHit = {
  id: string;
  email: string | null;
  domain: string | null;
  reason: SuppressionReason;
  source: string;
  created_at: string;
};

export async function findSuppression(
  supabase: SupabaseClient,
  input: { email?: string | null; domain?: string | null }
): Promise<SuppressionHit | null> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const domain = input.domain?.replace(/^www\./, "").toLowerCase() ?? "";

  if (email) {
    const { data } = await supabase.from("suppression_entries").select("*").ilike("email", email).maybeSingle();
    if (data) return data as SuppressionHit;
  }
  if (domain) {
    const { data } = await supabase.from("suppression_entries").select("*").ilike("domain", domain).maybeSingle();
    if (data) return data as SuppressionHit;
  }
  return null;
}

export async function addSuppression(
  supabase: SupabaseClient,
  input: { email?: string | null; domain?: string | null; reason: SuppressionReason; source: string }
): Promise<void> {
  const email = input.email ? normalizeEmail(input.email) : null;
  const domain = input.domain ? input.domain.replace(/^www\./, "").toLowerCase() : null;
  if (!email && !domain) return;

  const existing = await findSuppression(supabase, { email, domain });
  if (existing) return;

  const { error } = await supabase.from("suppression_entries").insert({
    email,
    domain: email ? null : domain,
    reason: input.reason,
    source: input.source,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("[kopvast] Suppression opslaan mislukt", error.message);
  }
}

export function isSuppressed(hit: SuppressionHit | null) {
  return Boolean(hit);
}

export function validEmailSyntax(value: string) {
  return isEmail(value);
}
