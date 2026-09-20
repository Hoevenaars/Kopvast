import { isEmail, normalizeEmail } from "@/lib/product";
import { emptyEnrichment, type ScoutEnrichment } from "@/lib/scout/types";

export function parseManualEmail(value: string): { ok: true; email: string } | { ok: false; message: string } {
  const email = normalizeEmail(value);
  if (!isEmail(email)) return { ok: false, message: "Vul een geldig e-mailadres in." };
  return { ok: true, email };
}

export function parseOptionalManualEmail(
  value: string | null | undefined
): { ok: true; email: string | null } | { ok: false; message: string } {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: true, email: null };
  return parseManualEmail(trimmed);
}

export function pickLeadEmail(current: string | null | undefined, scanned: string | null | undefined) {
  const existing = parseOptionalManualEmail(current);
  if (existing.ok && existing.email) return existing.email;
  const next = parseOptionalManualEmail(scanned);
  return next.ok ? next.email : null;
}

export function withManualEmailEnrichment(
  enrichment: ScoutEnrichment | Record<string, unknown> | null | undefined,
  email: string
): ScoutEnrichment {
  const current = (enrichment ?? {}) as ScoutEnrichment;
  return {
    ...emptyEnrichment(),
    ...current,
    email: { value: email, kind: "found" },
  };
}
