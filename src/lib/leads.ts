import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sendLeadNotification } from "@/lib/email";

export type StoredLead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string;
  website: string;
  message: string;
  source: string;
};

export type LeadInput = {
  name: string;
  email: string;
  company?: string;
  website?: string;
  message?: string;
  source?: string;
};

export type LeadResult =
  | { ok: true; duplicate?: boolean; emailed: boolean }
  | { ok: false; message: string };

const storeFile = path.join("/tmp", "kopvast-leads.json");

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function persistLead(lead: StoredLead) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  let existing: StoredLead[] = [];
  try {
    existing = JSON.parse(await readFile(storeFile, "utf8")) as StoredLead[];
  } catch {
    existing = [];
  }
  const duplicate = existing.some(
    (item) =>
      item.email === lead.email &&
      item.website === lead.website &&
      Date.now() - Date.parse(item.createdAt) < 1000 * 60 * 10
  );
  if (duplicate) {
    return { stored: false as const };
  }
  existing.push(lead);
  await writeFile(storeFile, JSON.stringify(existing, null, 2));
  return { stored: true as const };
}

export async function createLead(input: LeadInput): Promise<LeadResult> {
  const name = asString(input.name);
  const email = asString(input.email);
  const company = asString(input.company);
  const website = asString(input.website);
  const message = asString(input.message);
  const source = asString(input.source) || "aanvraag";

  if (!name || !isEmail(email)) {
    return { ok: false, message: "Naam en een geldig e-mailadres zijn verplicht." };
  }

  const lead: StoredLead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    email,
    company,
    website,
    message,
    source,
  };

  const stored = await persistLead(lead);
  if (!stored.stored) {
    return { ok: true, duplicate: true, emailed: false };
  }

  try {
    const sent = await sendLeadNotification({
      id: lead.id,
      name,
      email,
      company,
      website,
      message,
      source,
    });
    return { ok: true, emailed: sent.delivered };
  } catch {
    return { ok: true, emailed: false };
  }
}
