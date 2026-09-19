"use server";

import { createLead, type LeadResult } from "@/lib/leads";
import {
  DOMAIN_LANDING_SOURCE,
  domainLeadDetails,
  parseBidAmount,
  parseDomainIntent,
  parseDomainParam,
} from "@/lib/domain-landing";

export async function submitDomainInterest(
  _previous: LeadResult | null,
  formData: FormData
): Promise<LeadResult> {
  const domain = parseDomainParam(formData.get("domain"));
  const intent = parseDomainIntent(formData.get("intent"));
  const bid = parseBidAmount(String(formData.get("bidAmount") ?? ""));
  const wantsWebsite = formData.get("wantsWebsite") === "on";
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const message = String(formData.get("message") ?? "");

  if (!domain) {
    return { ok: false, message: "We konden dit domein niet herkennen." };
  }
  if (!intent) {
    return { ok: false, message: "Kies of je de prijs wilt opvragen of een bod wilt doen." };
  }
  if (!bid.ok) {
    return { ok: false, message: bid.message };
  }

  return createLead({
    name,
    email,
    website: domain,
    source: DOMAIN_LANDING_SOURCE,
    message,
    details: domainLeadDetails({
      domain,
      intent,
      bidAmount: bid.amount,
      wantsWebsite,
    }),
  });
}
