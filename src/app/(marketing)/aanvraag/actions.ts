"use server";

import { after } from "next/server";
import { acquireLead } from "@/lib/acquire";
import { parseInterestSubject, stripUntrustedCommercialFields } from "@/lib/interest";
import { createLead, type LeadResult } from "@/lib/leads";

const INTEREST_SOURCES = new Set(["interesse", "acquisitie-info", "acquisitie-voorstel"]);

export async function submitAanvraag(
  _previous: LeadResult | null,
  formData: FormData
): Promise<LeadResult> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const company = String(formData.get("company") ?? "");
  const website = String(formData.get("website") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const source = String(formData.get("source") ?? "website-aanvraag");
  const details: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (["name", "email", "company", "website", "phone", "source", "message"].includes(key)) continue;
    if (key.startsWith("$")) continue;
    if (typeof value === "string" && value.trim()) {
      details[key] = details[key] ? `${details[key]}, ${value}` : value;
    }
  }
  const safeDetails = stripUntrustedCommercialFields(details);
  const note = String(formData.get("message") ?? "").trim();

  if (INTEREST_SOURCES.has(source.trim())) {
    if (!company.trim()) return { ok: false, message: "Vul de bedrijfsnaam in." };
    if (!parseInterestSubject(safeDetails.Dienst)) return { ok: false, message: "Kies een onderwerp." };
    if (note.length < 3) return { ok: false, message: "Schrijf een korte toelichting." };
  }

  const result = await createLead({
    name,
    email,
    company,
    website,
    phone,
    source,
    details: safeDetails,
    message: String(formData.get("message") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  if (result.ok && website.trim()) {
    after(() =>
      acquireLead({ name, email, company, website, message: details.Idee || details.Toelichting }).catch(
        (error) => {
          console.error("[kopvast] Acquire na aanvraag mislukt", error);
        }
      )
    );
  }
  return result;
}
