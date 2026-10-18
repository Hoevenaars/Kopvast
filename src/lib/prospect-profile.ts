import { canonicalDomainFromInput } from "./acquire-score";
import { isConsumerEmailHost, normalizePhone } from "./acquisition-import";
import { parseOptionalManualEmail } from "./contact-email";
import { normalizeEmail } from "./product";

const SOCIAL_SUFFIXES = ["facebook.com", "fb.com", "fb.me", "instagram.com", "linkedin.com", "tiktok.com", "x.com", "twitter.com"];

export type ParsedProspectProfile = {
  firstName: string | null;
  lastName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  facebookUrl: string | null;
  socialUrl: string | null;
  city: string | null;
  notes: string | null;
};

export type WebsiteDecision =
  | { action: "absent"; scan: false }
  | { action: "reject"; message: string; scan: false }
  | { action: "website"; domain: string; websiteUrl: string; url: URL; scan: true };

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
}

export function cleanPersonName(value: string | null | undefined) {
  return cleanText(value);
}

export function joinContactName(firstName?: string | null, lastName?: string | null) {
  const name = [cleanPersonName(firstName), cleanPersonName(lastName)].filter(Boolean).join(" ");
  return name || null;
}

export function splitLegacyContactName(value: string | null | undefined) {
  const cleaned = cleanPersonName(value);
  if (!cleaned || cleaned.includes("@")) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function knownFirstName(input: { firstName?: string | null; contactName?: string | null }) {
  return cleanPersonName(input.firstName) || splitLegacyContactName(input.contactName).firstName || null;
}

export function greetingForContact(firstName?: string | null) {
  const first = cleanPersonName(firstName);
  if (!first || /[@:/]/.test(first)) return "Goedendag,";
  return `Hoi ${first},`;
}

export function isSocialHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return SOCIAL_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isFacebookHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return ["facebook.com", "fb.com", "fb.me"].some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function companyDomainFromEmail(email: string | null | undefined) {
  const host = normalizeEmail(email ?? "").split("@")[1] ?? "";
  if (!host || isConsumerEmailHost(host)) return null;
  return host;
}

export function prospectIdentityForProfile(input: { email?: string | null; phone?: string | null; company: string }) {
  const company = input.company.trim().toLowerCase().replace(/\s+/g, " ");
  const email = input.email?.trim() ? normalizeEmail(input.email) : "";
  if (email) return `${email}|${company}`;
  if (input.phone?.trim()) return `tel:${input.phone.trim()}|${company}`;
  return `|${company}`;
}

function parseName(value: string | null | undefined, label: string) {
  const name = cleanPersonName(value);
  if (!name) return { ok: true as const, name: null };
  if (name.length > 80) return { ok: false as const, message: `${label} is te lang.` };
  if (name.includes("@")) return { ok: false as const, message: `${label} is geen e-mailadres.` };
  return { ok: true as const, name };
}

export function parseOptionalPhone(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: true as const, phone: null };
  if (trimmed.length > 40 || !/^[0-9+().\s/-]+$/.test(trimmed)) {
    return { ok: false as const, message: "Vul een geldig telefoonnummer in." };
  }
  const phone = normalizePhone(trimmed);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return { ok: false as const, message: "Vul een geldig telefoonnummer in." };
  return { ok: true as const, phone };
}

function parseHttpUrl(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function parseFacebookUrl(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: true as const, url: null };
  const url = parseHttpUrl(trimmed);
  if (!url || !isFacebookHost(url.hostname)) return { ok: false as const, message: "Vul een geldige Facebook-URL in." };
  url.protocol = "https:";
  url.hostname = "www.facebook.com";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return { ok: true as const, url: url.toString() };
}

export function parseSocialUrl(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: true as const, url: null };
  const url = parseHttpUrl(trimmed);
  if (!url) return { ok: false as const, message: "De social URL is niet geldig." };
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (isConsumerEmailHost(host)) return { ok: false as const, message: "Een e-maildomein zoals gmail.com is geen social profiel." };
  url.protocol = "https:";
  url.hash = "";
  return { ok: true as const, url: url.toString() };
}

export function decideCompanyWebsite(raw: string): WebsiteDecision {
  const trimmed = raw.trim();
  if (!trimmed) return { action: "absent", scan: false };
  if (trimmed.includes("@")) {
    const host = trimmed.split("@").pop()?.toLowerCase() ?? "";
    if (isConsumerEmailHost(host)) {
      return { action: "reject", message: "Een e-maildomein zoals gmail.com is geen bedrijfswebsite.", scan: false };
    }
    return { action: "reject", message: "Een e-mailadres is geen bedrijfswebsite.", scan: false };
  }
  let hostname = "";
  try {
    hostname = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return { action: "reject", message: "Dit websiteadres is niet geldig.", scan: false };
  }
  const bare = hostname.replace(/^www\./, "");
  if (isConsumerEmailHost(bare)) {
    return { action: "reject", message: "Een e-maildomein zoals gmail.com is geen bedrijfswebsite.", scan: false };
  }
  if (isFacebookHost(hostname) || isSocialHost(hostname)) {
    return { action: "reject", message: "Een social profiel is geen website.", scan: false };
  }
  try {
    const parsed = canonicalDomainFromInput(trimmed);
    return { action: "website", domain: parsed.domain, websiteUrl: parsed.websiteUrl, url: parsed.url, scan: true };
  } catch (error) {
    return { action: "reject", message: error instanceof Error ? error.message : "Dit websiteadres is niet geldig.", scan: false };
  }
}

export function plannedProspectDomain(input: { hasWebsite: boolean; website?: string | null; email?: string | null }) {
  if (!input.hasWebsite) return { domain: null, scan: false as const };
  const decision = decideCompanyWebsite(input.website ?? "");
  if (decision.action !== "website") {
    return {
      domain: null,
      scan: false as const,
      message: decision.action === "reject" ? decision.message : "Vul een website in.",
    };
  }
  return { domain: decision.domain, websiteUrl: decision.websiteUrl, scan: true as const };
}

function parseOptionalLine(value: string | null | undefined, label: string, max: number) {
  const text = cleanText(value);
  if (!text) return { ok: true as const, text: null };
  if (text.length > max) return { ok: false as const, message: `${label} is te lang.` };
  return { ok: true as const, text };
}

export function parseProspectProfile(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  socialUrl?: string | null;
  city?: string | null;
  notes?: string | null;
}): { ok: true; profile: ParsedProspectProfile } | { ok: false; message: string } {
  const firstName = parseName(input.firstName, "Voornaam");
  if (!firstName.ok) return firstName;
  const lastName = parseName(input.lastName, "Achternaam");
  if (!lastName.ok) return lastName;
  const email = parseOptionalManualEmail(input.email);
  if (!email.ok) return email;
  const phone = parseOptionalPhone(input.phone);
  if (!phone.ok) return phone;
  const facebookUrl = parseFacebookUrl(input.facebookUrl);
  if (!facebookUrl.ok) return facebookUrl;
  const socialUrl = parseSocialUrl(input.socialUrl);
  if (!socialUrl.ok) return socialUrl;
  const city = parseOptionalLine(input.city, "Plaats", 80);
  if (!city.ok) return city;
  const notes = parseOptionalLine(input.notes, "Notitie", 4000);
  if (!notes.ok) return notes;
  return {
    ok: true,
    profile: {
      firstName: firstName.name,
      lastName: lastName.name,
      contactName: joinContactName(firstName.name, lastName.name),
      email: email.email,
      phone: phone.phone,
      facebookUrl: facebookUrl.url,
      socialUrl: socialUrl.url,
      city: city.text,
      notes: notes.text,
    },
  };
}
