"use server";

import { after } from "next/server";
import { acquireLead } from "@/lib/acquire";
import { createLead, type LeadResult } from "@/lib/leads";

export async function submitAanvraag(
  _previous: LeadResult | null,
  formData: FormData
): Promise<LeadResult> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const company = String(formData.get("company") ?? "");
  const website = String(formData.get("website") ?? "");
  const message = String(formData.get("message") ?? "");
  const source = String(formData.get("source") ?? "aanvraag");

  const result = await createLead({ name, email, company, website, message, source });
  if (result.ok && website.trim()) {
    after(() =>
      acquireLead({ name, email, company, website, message }).catch((error) => {
        console.error("[kopvast] Acquire na aanvraag mislukt", error);
      })
    );
  }
  return result;
}
