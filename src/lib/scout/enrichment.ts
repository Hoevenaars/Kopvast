import { canonicalRegistrableDomain } from "@/lib/ssrf";
import { emptyEnrichment, type ScoutEnrichment } from "./types";
import type { PageFacts } from "./scanner";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function walkJsonLd(blocks: Record<string, unknown>[]) {
  const out: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as Record<string, unknown>;
    out.push(record);
    if (record["@graph"]) visit(record["@graph"]);
  };
  blocks.forEach(visit);
  return out;
}

export function enrichFromFacts(facts: PageFacts): ScoutEnrichment {
  const enrichment = emptyEnrichment();
  const host = new URL(facts.fetchedUrl).hostname;
  const domain = canonicalRegistrableDomain(host);
  enrichment.domain = { value: domain, kind: "found" };
  enrichment.canonical_url = {
    value: facts.canonical || `${new URL(facts.fetchedUrl).protocol}//${host}/`,
    kind: facts.canonical ? "found" : "inferred",
  };

  const nodes = walkJsonLd(facts.jsonLd);
  const org = nodes.find((node) => {
    const type = node["@type"];
    const value = Array.isArray(type) ? type.join(" ") : String(type ?? "");
    return /organization|localbusiness|corporation/i.test(value);
  });

  const orgName = asString(org?.name) || facts.ogTitle || facts.title;
  if (orgName) {
    enrichment.company_name = { value: orgName.replace(/\s*[|\-–].*$/, "").trim(), kind: org?.name ? "found" : "inferred" };
  }

  const address = org?.address;
  if (address && typeof address === "object") {
    const city = asString((address as Record<string, unknown>).addressLocality);
    if (city) enrichment.city = { value: city, kind: "found" };
  }

  const orgEmail = asString(org?.email);
  if (orgEmail) enrichment.email = { value: orgEmail.toLowerCase(), kind: "found" };
  else if (facts.emails[0]) enrichment.email = { value: facts.emails[0], kind: "found" };

  const orgPhone = asString(org?.telephone);
  if (orgPhone) enrichment.phone = { value: orgPhone, kind: "found" };
  else if (facts.phones[0]) enrichment.phone = { value: facts.phones[0], kind: "found" };

  if (facts.linkedin) enrichment.linkedin_url = { value: facts.linkedin, kind: "found" };
  if (facts.description) enrichment.description = { value: facts.description, kind: "found" };

  return enrichment;
}

export function applyFoundOnly<T>(field: ScoutEnrichment[keyof ScoutEnrichment]): T | null {
  if (field.kind === "unknown" || field.value == null) return null;
  return field.value as T;
}
