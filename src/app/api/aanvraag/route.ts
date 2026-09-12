import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sendLeadNotification } from "@/lib/email";

export const runtime = "nodejs";

type StoredLead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string;
  website: string;
  message: string;
  source: string;
};

const storeFile = path.join("/tmp", "kopvast-leads.json");

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function storeLead(lead: StoredLead) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  let existing: StoredLead[] = [];
  try {
    existing = JSON.parse(await readFile(storeFile, "utf8")) as StoredLead[];
  } catch {
    existing = [];
  }
  const duplicate = existing.some(
    (item) => item.email === lead.email && item.website === lead.website && Date.now() - Date.parse(item.createdAt) < 1000 * 60 * 10
  );
  if (duplicate) {
    return { stored: false as const, reason: "duplicate" };
  }
  existing.push(lead);
  await writeFile(storeFile, JSON.stringify(existing, null, 2));
  return { stored: true as const };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = asString(body?.name);
  const email = asString(body?.email);
  const company = asString(body?.company);
  const website = asString(body?.website);
  const message = asString(body?.message);
  const source = asString(body?.source) || "aanvraag";

  if (!name || !isEmail(email)) {
    return NextResponse.json({ message: "Naam en een geldig e-mailadres zijn verplicht." }, { status: 400 });
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

  const stored = await storeLead(lead);
  if (!stored.stored) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await sendLeadNotification({ name, email, company, website, message, source });
  } catch (error) {
    return NextResponse.json(
      {
        ok: true,
        emailed: false,
        message: error instanceof Error ? error.message : "Aanvraag opgeslagen zonder e-mailnotificatie.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}
