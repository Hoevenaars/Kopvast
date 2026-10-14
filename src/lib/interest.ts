import { NEXT_ACTIONS } from "@/lib/commercial";

/**
 * Publieke interesse is geen aankoop.
 * Een bedrag uit een URL of formulier wordt hier nooit een afgesproken prijs.
 */

export const interestSubjects = [
  { value: "website-nieuw", label: "Nieuwe website", lane: "website" },
  { value: "website-vernieuwen", label: "Bestaande website vernieuwen", lane: "website" },
  { value: "merk", label: "Merk en ontwerp", lane: "maatwerk" },
  { value: "marketing", label: "Marketing en activatie", lane: "maatwerk" },
  { value: "automatisering", label: "Automatisering en AI", lane: "automatisering" },
  { value: "overig", label: "Overige vraag", lane: "overig" },
] as const;

export type InterestSubject = (typeof interestSubjects)[number]["value"];
export type InterestLane = (typeof interestSubjects)[number]["lane"];

const UNTRUSTED_PRICE_KEYS = new Set([
  "prijs",
  "price",
  "offerprice",
  "offerteprijs",
  "bedrag",
  "startbevestiging",
  "korting",
]);

const PUBLIC_SOURCES = new Set([
  "interesse",
  "website-aanvraag",
  "maatwerk",
  "acquisitie-info",
  "acquisitie-voorstel",
]);

export function parseInterestSubject(raw: string | null | undefined) {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return null;
  return (
    interestSubjects.find((item) => item.value === value || item.label.toLowerCase() === value) ?? null
  );
}

export function interestLane(raw: string | null | undefined): InterestLane | null {
  return parseInterestSubject(raw)?.lane ?? null;
}

export function requestTypeForInterest(
  source: string,
  subject?: string | null
): "website" | "maatwerk" {
  const lane = interestLane(subject);
  if (lane === "website") return "website";
  if (lane) return "maatwerk";
  if (source === "maatwerk" || source === "interesse") return "maatwerk";
  return "website";
}

export function publicInterestNextAction(input: { source: string; subject?: string | null }) {
  if (input.source === "acquisitie-voorstel") return NEXT_ACTIONS.MAKE_PROPOSAL;
  return NEXT_ACTIONS.CALL_CLIENT;
}

export function isPublicInterestSource(source: string) {
  return PUBLIC_SOURCES.has(source);
}

/** Een publiek bedrag is nooit de afspraak. De catalogus en een geaccepteerd voorstel wel. */
export function bindingPriceFromPublicQuery(raw: unknown): null {
  void raw;
  return null;
}

export function stripUntrustedCommercialFields(details: Record<string, string>) {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (key.startsWith("$") || UNTRUSTED_PRICE_KEYS.has(key.trim().toLowerCase())) continue;
    next[key] = value;
  }
  return next;
}

export function interestContext(details: Record<string, string>) {
  const subject = parseInterestSubject(details.Dienst);
  const website = (details.website ?? "").trim();
  return {
    dienst: subject?.value ?? "",
    dienstLabel: subject?.label ?? details.Dienst?.trim() ?? "",
    hasWebsite: website ? "ja" : "nee",
    landing: details.Landing?.trim().slice(0, 180) ?? "",
    cta: details.CTA?.trim().slice(0, 120) ?? "",
    utmSource: details.utm_source?.trim().slice(0, 80) ?? "",
    utmMedium: details.utm_medium?.trim().slice(0, 80) ?? "",
    utmCampaign: details.utm_campaign?.trim().slice(0, 80) ?? "",
  };
}

export type InterestSummaryInput = {
  source: string | null;
  type: string;
  proposal_status: string | null;
  payload: Record<string, unknown> | null;
};

export function summarizeRequests(items: InterestSummaryInput[]) {
  const bySubject: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let proposals = 0;
  let accepted = 0;
  for (const item of items) {
    const source = item.source || "onbekend";
    bySource[source] = (bySource[source] ?? 0) + 1;
    const dienst = typeof item.payload?.dienst === "string" && item.payload.dienst ? item.payload.dienst : item.type;
    bySubject[dienst] = (bySubject[dienst] ?? 0) + 1;
    if (item.proposal_status) proposals += 1;
    if (item.proposal_status === "ACCEPTED") accepted += 1;
  }
  return { total: items.length, bySubject, bySource, proposals, accepted };
}
