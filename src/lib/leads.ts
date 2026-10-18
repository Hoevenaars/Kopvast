import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { recordPublicRequestActivity } from "@/lib/aanvragen";
import { sendLeadNotification } from "@/lib/email";
import { persistPublicInboundLead, type InboundLeadInput, type PublicLeadSaveResult } from "@/lib/inbound";
import { stripUntrustedCommercialFields } from "@/lib/interest";

export type StoredLead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string;
  website: string;
  message: string;
  source: string;
  phone: string;
  details: Record<string, string>;
};

export type LeadInput = {
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  source?: string;
  phone?: string;
  details?: Record<string, string>;
  idempotencyKey?: string;
};

export type LeadResult =
  | { ok: true; duplicate?: boolean; emailed: boolean; id?: string }
  | { ok: false; message: string };

const storeFile = path.join("/tmp", "kopvast-leads.json");
const memoryLeads = new Map<string, StoredLead>();
let forcedSave: ((lead: InboundLeadInput, idempotencyKey: string) => Promise<PublicLeadSaveResult>) | null = null;

export function setLeadSaveForTests(
  save: ((lead: InboundLeadInput, idempotencyKey: string) => Promise<PublicLeadSaveResult>) | null
) {
  forcedSave = save;
}

export function resetMemoryLeadStoreForTests() {
  memoryLeads.clear();
}

export function publicLeadIdempotencyKey(input: {
  clientKey?: string | null;
  email: string;
  source: string;
  company: string;
  website: string;
  message: string;
  now?: number;
}) {
  const client = (input.clientKey ?? "").trim();
  if (/^[A-Za-z0-9_-]{16,80}$/.test(client)) return `client:${client}`;
  const fingerprint = createHash("sha256")
    .update(
      [input.email.toLowerCase(), input.source, input.company.toLowerCase(), input.website.toLowerCase(), input.message]
        .join("\n")
    )
    .digest("hex");
  const bucket = Math.floor((input.now ?? Date.now()) / (6 * 60 * 60 * 1000));
  return `content:${fingerprint}:${bucket}`;
}

function explicitLeadStore() {
  const mode = process.env.KOPVAST_LEAD_STORE;
  return mode === "memory" || mode === "file" ? mode : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const FIELD_LIMITS = {
  name: 120,
  email: 180,
  company: 160,
  website: 300,
  phone: 40,
  message: 4000,
  detail: 2000,
  detailKeys: 25,
} as const;

function tooLong(value: string, max: number) {
  return value.length > max;
}

export function formatLeadDetails(details: Record<string, string>): string {
  return Object.entries(details)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

async function persistExplicitFileLead(lead: StoredLead, idempotencyKey: string): Promise<PublicLeadSaveResult> {
  await mkdir(path.dirname(storeFile), { recursive: true });
  let existing: Array<StoredLead & { idempotencyKey?: string }> = [];
  try {
    existing = JSON.parse(await readFile(storeFile, "utf8")) as Array<StoredLead & { idempotencyKey?: string }>;
  } catch {
    existing = [];
  }
  const prior = existing.find((item) => item.idempotencyKey === idempotencyKey);
  if (prior) return { ok: true, id: prior.id, duplicate: true };
  existing.push({ ...lead, idempotencyKey });
  await writeFile(storeFile, JSON.stringify(existing, null, 2));
  return { ok: true, id: lead.id, duplicate: false };
}

async function saveLead(lead: StoredLead, idempotencyKey: string): Promise<PublicLeadSaveResult> {
  if (forcedSave) return forcedSave(lead, idempotencyKey);
  const mode = explicitLeadStore();
  if (mode === "memory") {
    const existing = memoryLeads.get(idempotencyKey);
    if (existing) return { ok: true, id: existing.id, duplicate: true };
    memoryLeads.set(idempotencyKey, lead);
    return { ok: true, id: lead.id, duplicate: false };
  }
  if (mode === "file") return persistExplicitFileLead(lead, idempotencyKey);
  return persistPublicInboundLead(lead, idempotencyKey);
}

export async function createLead(input: LeadInput): Promise<LeadResult> {
  const name = asString(input.name);
  const email = asString(input.email);
  const company = asString(input.company);
  const website = asString(input.website);
  const details = stripUntrustedCommercialFields(input.details ?? {});
  const message = asString(input.message) || formatLeadDetails(details);
  const source = asString(input.source) || "aanvraag";
  const phone = asString(input.phone);

  if (!name || !isEmail(email)) {
    return { ok: false, message: "Naam en een geldig e-mailadres zijn verplicht." };
  }
  if (
    tooLong(name, FIELD_LIMITS.name) ||
    tooLong(email, FIELD_LIMITS.email) ||
    tooLong(company, FIELD_LIMITS.company) ||
    tooLong(website, FIELD_LIMITS.website) ||
    tooLong(phone, FIELD_LIMITS.phone) ||
    tooLong(message, FIELD_LIMITS.message) ||
    Object.keys(details).length > FIELD_LIMITS.detailKeys ||
    Object.values(details).some((value) => tooLong(value, FIELD_LIMITS.detail))
  ) {
    return { ok: false, message: "Een van de velden is te lang. Kort de tekst in en probeer het opnieuw." };
  }

  const idempotencyKey = publicLeadIdempotencyKey({
    clientKey: input.idempotencyKey,
    email,
    source,
    company,
    website,
    message,
  });
  const lead: StoredLead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    email,
    company,
    website,
    message,
    source,
    phone,
    details,
  };

  const stored = await saveLead(lead, idempotencyKey);
  if (!stored.ok) return stored;
  if (stored.duplicate) return { ok: true, duplicate: true, emailed: false, id: stored.id };

  await recordPublicRequestActivity({
    leadId: stored.id,
    source,
    dienst: details.Dienst,
  }).catch((error) => {
    console.error("[kopvast] Aanvraag-activiteit opslaan mislukt", error instanceof Error ? error.name : "activity");
  });

  try {
    const sent = await sendLeadNotification({
      id: stored.id,
      inboundId: explicitLeadStore() ? undefined : stored.id,
      name,
      email,
      company,
      website,
      message,
      source,
      phone,
      details,
    });
    return { ok: true, emailed: sent.delivered, id: stored.id };
  } catch (error) {
    console.error("[kopvast] Aanvraag opgeslagen, e-mail mislukt", error instanceof Error ? error.name : "email");
    return { ok: true, emailed: false, id: stored.id };
  }
}
