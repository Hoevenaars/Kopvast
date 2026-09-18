import { canonicalRegistrableDomain, normalizeWebsiteUrl } from "@/lib/ssrf";
import { isScoutSource, type ScoutSource } from "./types";

export function parseScoutUrl(input: string) {
  const url = normalizeWebsiteUrl(input);
  const domain = canonicalRegistrableDomain(url.hostname);
  const canonicalUrl = `${url.protocol}//${url.host}/`;
  return { url, domain, canonicalUrl, normalized: url.toString() };
}

export function extractUrlFromShare(input: {
  url?: string | null;
  text?: string | null;
  title?: string | null;
}): string | null {
  const chunks = [input.url, input.text, input.title].filter(Boolean).join("\n");
  const match = chunks.match(/https?:\/\/[^\s<>"']+/i) || chunks.match(/\b(?:www\.)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  if (!match) return null;
  try {
    return parseScoutUrl(match[0].replace(/[),.;]+$/, "")).normalized;
  } catch {
    return null;
  }
}

export function inferSource(input: {
  source?: string | null;
  via?: string | null;
}): ScoutSource {
  const value = (input.source || input.via || "").trim();
  if (isScoutSource(value)) return value;
  if (value === "share") return "safari_share";
  if (value === "new") return "shortcut";
  return "scout_manual";
}
