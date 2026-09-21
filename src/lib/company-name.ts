import { normalizeCompanyName } from "@/lib/customers";
import { emptyEnrichment, type ScoutEnrichment } from "@/lib/scout/types";

const GENERIC_COMPANY_LABELS = new Set(
  [
    "klusbedrijf",
    "bouwbedrijf",
    "aannemer",
    "aannemersbedrijf",
    "schildersbedrijf",
    "timmerbedrijf",
    "installatiebedrijf",
    "loodgieter",
    "dakdekker",
    "stratenmaker",
    "schoonmaakbedrijf",
    "kapsalon",
    "kapper",
    "restaurant",
    "cafe",
    "hotel",
    "home",
    "welkom",
    "website",
    "untitled",
    "wix",
    "wix com",
    "just a moment",
    "loading",
    "bedrijf",
  ].map((item) => normalizeCompanyName(item))
);

export function parseManualCompanyName(
  value: string
): { ok: true; company: string } | { ok: false; message: string } {
  const company = value.replace(/\s+/g, " ").trim();
  if (!company) return { ok: false, message: "Vul een bedrijfsnaam in." };
  if (company.length > 120) return { ok: false, message: "De bedrijfsnaam is te lang." };
  return { ok: true, company };
}

export function stripTitleNoise(value: string) {
  return value.replace(/\s*[|\-–].*$/, "").replace(/\s+/g, " ").trim();
}

export function isGenericCompanyName(value: string | null | undefined) {
  const normalized = normalizeCompanyName(value);
  if (!normalized) return true;
  return GENERIC_COMPANY_LABELS.has(normalized);
}

export function brandFromDomain(domain: string) {
  const host = domain.replace(/^www\./i, "").split("/")[0]?.split(".")[0] ?? "";
  return host
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function preferredCompanyName(input: {
  jsonLdName?: string | null;
  ogTitle?: string | null;
  title?: string | null;
  h1?: string | null;
  domain: string;
}): { value: string; kind: "found" | "inferred" } | null {
  const candidates: Array<{ value: string; kind: "found" | "inferred" }> = [];
  const jsonLd = input.jsonLdName ? stripTitleNoise(input.jsonLdName) : "";
  if (jsonLd) candidates.push({ value: jsonLd, kind: "found" });
  for (const raw of [input.ogTitle, input.title, input.h1]) {
    const value = raw ? stripTitleNoise(raw) : "";
    if (value) candidates.push({ value, kind: "inferred" });
  }
  const labeled = candidates.find((item) => isUsableCompanyLabel(item.value));
  if (labeled) return labeled;
  const brand = brandFromDomain(input.domain);
  if (isUsableCompanyLabel(brand)) return { value: brand, kind: "inferred" };
  return labeled ?? (brand ? { value: brand, kind: "inferred" } : null);
}

export function pickStoredCompanyName(incoming: string | null | undefined, existing: string | null | undefined) {
  const next = incoming?.trim() || "";
  const prev = existing?.trim() || "";
  if (prev && !isGenericCompanyName(prev)) return prev;
  if (next && !isGenericCompanyName(next)) return next;
  return next || prev || null;
}

export function replaceCompanyNameInText(text: string | null | undefined, from: string, to: string) {
  const previous = from.trim();
  const next = to.trim();
  const value = text ?? "";
  if (!previous || previous.length < 3 || !next || previous === next) return value;
  return value.split(previous).join(next);
}

export function withManualCompanyEnrichment(
  enrichment: ScoutEnrichment | Record<string, unknown> | null | undefined,
  company: string
): ScoutEnrichment {
  const current = (enrichment ?? {}) as ScoutEnrichment;
  return {
    ...emptyEnrichment(),
    ...current,
    company_name: { value: company, kind: "found" },
  };
}

function isUsableCompanyLabel(value: string) {
  if (!value || isGenericCompanyName(value)) return false;
  if (value.length > 60) return false;
  return true;
}
