import { isEmail, normalizeEmail } from "./product";

export const MAX_IMPORT_PROSPECTS = 80;

const CONSUMER_EMAIL_HOSTS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.nl",
  "live.com",
  "live.nl",
  "outlook.com",
  "outlook.nl",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "yahoo.nl",
  "proton.me",
  "protonmail.com",
]);

const WEBSITE_ALIASES: Record<string, string> = {
  "pizzaria leuth": "cafetarialeuth.nl",
  "pizzeria leuth": "cafetarialeuth.nl",
  "cafetaria leuth": "cafetarialeuth.nl",
};

const HEADER_LINE = /^(naam\s*website|e-?mail|websites?\s+koud)/i;
const UNKNOWN_MAIL = /^(mail\??|onbekend|\?+|n\/?a|geen)$/i;
const PHONE_VALUE = /^(0\d[\d\s-]{7,}|(?:\+|00)31[\d\s-]{8,})$/;
const DOMAIN_VALUE = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#].*)?$/i;

export type ParsedImportRow = {
  website: string;
  domainHint: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  raw: string;
};

export type ParseImportResult = {
  rows: ParsedImportRow[];
  errors: Array<{ line: string; message: string }>;
};

export function looksLikeDomain(value: string) {
  return DOMAIN_VALUE.test(value.trim());
}

export function looksLikePhone(value: string) {
  return PHONE_VALUE.test(value.replace(/\s+/g, " ").trim());
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function splitColumns(line: string): { left: string; right: string } {
  const trimmed = line.replace(/\u00a0/g, " ").trim();
  if (!trimmed) return { left: "", right: "" };
  if (trimmed.includes("\t")) {
    const [left, ...rest] = trimmed.split("\t");
    return { left: left.trim(), right: rest.join(" ").trim() };
  }
  const wide = trimmed.match(/^(.*?)\s{2,}(.+)$/);
  if (wide) return { left: wide[1].trim(), right: wide[2].trim() };
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? "";
    if (isEmail(last) || looksLikePhone(last) || UNKNOWN_MAIL.test(last)) {
      return { left: parts.slice(0, -1).join(" "), right: last };
    }
  }
  return { left: trimmed, right: "" };
}

function hostFromEmail(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function websiteFromLabel(label: string, email: string | null): { website: string | null; company: string | null } {
  const cleaned = label.replace(/\u00a0/g, " ").trim();
  const alias = WEBSITE_ALIASES[cleaned.toLowerCase()];
  if (alias) return { website: alias, company: cleaned };
  if (looksLikeDomain(cleaned)) {
    return { website: cleaned, company: companyFromDomainLabel(cleaned) };
  }
  if (email) {
    const host = hostFromEmail(email);
    if (host && !CONSUMER_EMAIL_HOSTS.has(host)) {
      return { website: host, company: prettyCompanyName(cleaned) };
    }
  }
  return { website: null, company: cleaned || null };
}

function companyFromDomainLabel(label: string) {
  const host = label
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/:?#]/)[0];
  const base = host?.split(".")[0] ?? label;
  if (!base) return null;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function prettyCompanyName(value: string) {
  return value.replace(/\s+/g, " ").trim() || null;
}

function classifyRight(value: string): { email: string | null; phone: string | null; missingMail: boolean } {
  const right = value.replace(/\u00a0/g, " ").trim();
  if (!right || UNKNOWN_MAIL.test(right)) return { email: null, phone: null, missingMail: Boolean(right) };
  if (isEmail(right)) return { email: normalizeEmail(right), phone: null, missingMail: false };
  if (looksLikePhone(right)) return { email: null, phone: normalizePhone(right), missingMail: false };
  return { email: null, phone: null, missingMail: false };
}

function finishRow(input: {
  label: string;
  email: string | null;
  phone: string | null;
  raw: string;
}): ParsedImportRow | { error: string; line: string } {
  const resolved = websiteFromLabel(input.label, input.email);
  if (!resolved.website) {
    return {
      error: "Dit is geen websiteadres en het e-mailadres geeft ook geen domein.",
      line: input.raw,
    };
  }
  const notes = [
    "Koude acquisitielijst",
    input.phone ? `Telefoon uit lijst: ${input.phone}` : null,
    !input.email ? "Geen e-mailadres in de lijst" : null,
    WEBSITE_ALIASES[input.label.trim().toLowerCase()] ? `Website afgeleid van bedrijfsnaam (${resolved.website})` : null,
  ]
    .filter(Boolean)
    .join(". ");
  return {
    website: resolved.website,
    domainHint: resolved.website,
    email: input.email,
    phone: input.phone,
    company: resolved.company,
    notes,
    raw: input.raw,
  };
}

export function parseProspectImportText(text: string): ParseImportResult {
  const rows: ParsedImportRow[] = [];
  const errors: Array<{ line: string; message: string }> = [];
  let pendingLabel: { label: string; raw: string } | null = null;

  const flushPending = () => {
    if (!pendingLabel) return;
    const finished = finishRow({
      label: pendingLabel.label,
      email: null,
      phone: null,
      raw: pendingLabel.raw,
    });
    if ("error" in finished) errors.push({ line: finished.line, message: finished.error });
    else rows.push(finished);
    pendingLabel = null;
  };

  for (const original of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = original.replace(/\u00a0/g, " ").trim();
    if (!line || HEADER_LINE.test(line)) continue;

    const { left, right } = splitColumns(line);
    const classified = classifyRight(right);
    const leftIsContact = !right && (isEmail(left) || looksLikePhone(left) || UNKNOWN_MAIL.test(left));

    if (leftIsContact) {
      const contact = classifyRight(left);
      if (pendingLabel) {
        const finished = finishRow({
          label: pendingLabel.label,
          email: contact.email,
          phone: contact.phone,
          raw: `${pendingLabel.raw}\n${line}`,
        });
        if ("error" in finished) errors.push({ line: finished.line, message: finished.error });
        else rows.push(finished);
        pendingLabel = null;
        continue;
      }
      errors.push({ line, message: "Dit contact hoort bij geen website." });
      continue;
    }

    if (right || classified.email || classified.phone || classified.missingMail) {
      flushPending();
      const finished = finishRow({
        label: left,
        email: classified.email,
        phone: classified.phone,
        raw: line,
      });
      if ("error" in finished) errors.push({ line: finished.line, message: finished.error });
      else rows.push(finished);
      continue;
    }

    flushPending();
    pendingLabel = { label: left, raw: line };
  }

  flushPending();

  const seen = new Set<string>();
  const unique: ParsedImportRow[] = [];
  for (const row of rows) {
    const key = row.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase();
    if (seen.has(key)) {
      errors.push({ line: row.raw, message: `Dubbel in deze lijst: ${row.website}` });
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  return { rows: unique, errors };
}
