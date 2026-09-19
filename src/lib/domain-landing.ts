export const DOMAIN_LANDING_SOURCE = "domain_landingspage";
export const DOMAIN_LANDING_PATH = "/domein";

export const domainIntents = [
  { value: "price", label: "Prijsaanvraag" },
  { value: "bid", label: "Bod" },
] as const;

export type DomainIntent = (typeof domainIntents)[number]["value"];

const APP_HOSTS = new Set(["kopvast.nl", "www.kopvast.nl", "localhost", "127.0.0.1", "::1"]);
const DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isDomainLandingSource(source: string | null | undefined): boolean {
  return source === DOMAIN_LANDING_SOURCE;
}

export function isDomainIntent(value: string): value is DomainIntent {
  return domainIntents.some((item) => item.value === value);
}

export function intentLabel(intent: DomainIntent) {
  return intent === "bid" ? "Bod" : "Prijsaanvraag";
}

export function parseDomainIntent(raw: unknown): DomainIntent | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (value === "price" || value === "prijsaanvraag") return "price";
  if (value === "bid" || value === "bod") return "bid";
  return null;
}

export function hostnameFromHostHeader(host: string) {
  return host.split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isKopvastAppHost(host: string) {
  const hostname = hostnameFromHostHeader(host);
  if (!hostname) return true;
  if (APP_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".vercel.app")) return true;
  if (hostname.endsWith(".localhost")) return true;
  if (hostname.startsWith("scout.")) return true;
  return false;
}

export function parseDomainParam(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 253) return null;
  if (/[\s<>'"\\]/.test(trimmed)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.username || url.password) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const domain = url.hostname.replace(/\.$/, "").toLowerCase().replace(/^www\./, "");
    if (!DOMAIN_PATTERN.test(domain)) return null;
    if (domain === "localhost" || domain.endsWith(".local") || domain.endsWith(".localhost")) return null;
    return domain;
  } catch {
    return null;
  }
}

export function parkedDomainFromHost(host: string): string | null {
  if (isKopvastAppHost(host)) return null;
  return parseDomainParam(hostnameFromHostHeader(host));
}

export function domainLandingRedirectUrl(host: string, siteOrigin: string): string | null {
  const domain = parkedDomainFromHost(host);
  if (!domain) return null;
  const dest = new URL(DOMAIN_LANDING_PATH, siteOrigin);
  dest.searchParams.set("domain", domain);
  return dest.toString();
}

export function parseBidAmount(raw: unknown): { ok: true; amount: number | null } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: true, amount: null };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, amount: null };

  const cleaned = trimmed.replace(/€/g, "").replace(/\s/g, "");
  let normalized = cleaned;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(",", ".");
  } else if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, message: "Vul een geldig bedrag in euro's in." };
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99_999_999) {
    return { ok: false, message: "Vul een geldig bedrag in euro's in." };
  }

  return { ok: true, amount: Math.round(amount * 100) / 100 };
}

export function formatBidAmount(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function websiteInterestLabel(value: boolean) {
  return value ? "Ja" : "Nee";
}

export function domainLeadDetails(input: {
  domain: string;
  intent: DomainIntent;
  bidAmount?: number | null;
  wantsWebsite: boolean;
}) {
  const details: Record<string, string> = {
    Domein: input.domain,
    Type: intentLabel(input.intent),
    "Website interesse": websiteInterestLabel(input.wantsWebsite),
  };
  if (input.intent === "bid" && input.bidAmount != null) {
    details.Bod = formatBidAmount(input.bidAmount);
  }
  return details;
}
