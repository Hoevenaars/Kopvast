"use server";

import { createLead, type LeadResult } from "@/lib/leads";

export async function submitAanvraag(
  _previous: LeadResult | null,
  formData: FormData
): Promise<LeadResult> {
  return createLead({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    website: String(formData.get("website") ?? ""),
    message: String(formData.get("message") ?? ""),
    source: String(formData.get("source") ?? "aanvraag"),
  });
}
