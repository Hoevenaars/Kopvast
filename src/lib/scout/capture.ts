import { after } from "next/server";
import { parseOptionalManualEmail } from "@/lib/contact-email";
import { parseManualCompanyName } from "@/lib/company-name";
import { decideCompanyWebsite, parseProspectProfile } from "@/lib/prospect-profile";
import { parseScoutUrl } from "./urls";
import { findCompanyLeadWithoutWebsite, findLeadByDomain, findLeadWithoutWebsite, getLead, insertLead, toDuplicate, appendEvent, updateLead } from "./leads";
import { enqueuePipelineJob } from "./jobs";
import { processScoutJobs } from "./pipeline";
import { consumeRateLimit, rateLimitMessage } from "./rate-limit";
import type { PushLeadResult, ScoutSource, ScoutUser } from "./types";

function optionalSourceUrl(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return { ok: true as const, url: null };
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false as const, message: "Bron-URL is niet geldig." };
    }
    return { ok: true as const, url: url.toString() };
  } catch {
    return { ok: false as const, message: "Bron-URL is niet geldig." };
  }
}

function profileFromCapture(input: {
  firstName?: string | null;
  lastName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  socialUrl?: string | null;
  city?: string | null;
  note?: string | null;
}) {
  const legacy = input.contactName?.trim().split(/\s+/) ?? [];
  return parseProspectProfile({
    firstName: input.firstName || legacy[0],
    lastName: input.lastName || legacy.slice(1).join(" "),
    email: input.email,
    phone: input.phone,
    facebookUrl: input.facebookUrl,
    socialUrl: input.socialUrl,
    city: input.city,
    notes: input.note,
  });
}

export async function pushScoutLead(input: {
  user: ScoutUser;
  website: string;
  note?: string | null;
  email?: string | null;
  source: ScoutSource;
  forceRescanOf?: string;
  hasWebsite?: boolean;
  company?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  socialUrl?: string | null;
  city?: string | null;
  sourceUrl?: string | null;
}): Promise<PushLeadResult> {
  const profile = profileFromCapture(input);
  if (!profile.ok) return profile;
  if (input.hasWebsite === false) return pushScoutLeadWithoutWebsite(input, profile.profile);

  const decision = decideCompanyWebsite(input.website);
  if (decision.action !== "website") {
    return { ok: false, message: decision.action === "reject" ? decision.message : "Vul een website in." };
  }
  let parsed: ReturnType<typeof parseScoutUrl>;
  try {
    parsed = parseScoutUrl(input.website);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Dit websiteadres is niet geldig." };
  }

  const limited = await consumeRateLimit("lead_create", input.user.id);
  if (!limited.ok) return { ok: false, message: rateLimitMessage(limited.retryAfterSec) };

  const existing = await findLeadByDomain(input.user.id, parsed.domain);
  if (existing && existing.id !== input.forceRescanOf) {
    return { ok: false, duplicate: true, existing: toDuplicate(existing) };
  }

  const parsedEmail = parseOptionalManualEmail(input.email);
  if (!parsedEmail.ok) return parsedEmail;
  const sourceUrl = optionalSourceUrl(input.sourceUrl);
  if (!sourceUrl.ok) return sourceUrl;

  const note = profile.profile.notes;
  const lead = existing
    ? existing
    : await insertLead({
        user: input.user,
        url: parsed.normalized,
        domain: parsed.domain,
        canonicalUrl: parsed.canonicalUrl,
        note,
        email: parsedEmail.email,
        company: input.company,
        firstName: profile.profile.firstName,
        lastName: profile.profile.lastName,
        phone: profile.profile.phone,
        facebookUrl: profile.profile.facebookUrl,
        socialUrl: profile.profile.socialUrl,
        city: profile.profile.city,
        sourceUrl: sourceUrl.url,
        source: input.source,
      });

  if (!existing) {
    await appendEvent({
      lead_id: lead.id,
      event_type: "lead_created",
      actor_type: "human",
      metadata: { source: input.source, domain: parsed.domain },
    });
  }

  await enqueuePipelineJob(lead.id, existing ? "rescan" : "create");
  after(() =>
    processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
  );
  return { ok: true, leadId: lead.id };
}

async function pushScoutLeadWithoutWebsite(
  input: {
    user: ScoutUser;
    note?: string | null;
    email?: string | null;
    source: ScoutSource;
    company?: string | null;
    contactName?: string | null;
    phone?: string | null;
    sourceUrl?: string | null;
  },
  profile: {
    firstName: string | null;
    lastName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    facebookUrl: string | null;
    socialUrl: string | null;
    city: string | null;
    notes: string | null;
  }
): Promise<PushLeadResult> {
  const company = parseManualCompanyName(input.company ?? "");
  if (!company.ok) return company;
  const sourceUrl = optionalSourceUrl(input.sourceUrl);
  if (!sourceUrl.ok) return sourceUrl;

  const limited = await consumeRateLimit("lead_create", input.user.id);
  if (!limited.ok) return { ok: false, message: rateLimitMessage(limited.retryAfterSec) };

  const existing = profile.email
    ? await findLeadWithoutWebsite(input.user.id, profile.email, company.company)
    : await findCompanyLeadWithoutWebsite(input.user.id, company.company);
  if (existing) return { ok: false, duplicate: true, existing: toDuplicate(existing) };

  const lead = await insertLead({
    user: input.user,
    url: "",
    domain: "",
    canonicalUrl: null,
    note: profile.notes,
    email: profile.email,
    company: company.company,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    facebookUrl: profile.facebookUrl,
    socialUrl: profile.socialUrl,
    city: profile.city,
    sourceUrl: sourceUrl.url,
    source: input.source,
  });
  await appendEvent({
    lead_id: lead.id,
    event_type: "lead_created",
    actor_type: "human",
    metadata: { source: input.source, website: false, company: company.company },
  });
  await enqueuePipelineJob(lead.id, "create");
  after(() =>
    processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
  );
  return { ok: true, leadId: lead.id };
}

export async function attachScoutWebsite(input: { user: ScoutUser; leadId: string; website: string }) {
  const lead = await getLead(input.user.id, input.leadId);
  if (!lead) return { ok: false as const, message: "Lead niet gevonden." };
  const decision = decideCompanyWebsite(input.website);
  if (decision.action !== "website") {
    return { ok: false as const, message: decision.action === "reject" ? decision.message : "Vul een website in." };
  }
  let parsed: ReturnType<typeof parseScoutUrl>;
  try {
    parsed = parseScoutUrl(input.website);
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Dit websiteadres is niet geldig." };
  }
  const existing = await findLeadByDomain(input.user.id, parsed.domain);
  if (existing && existing.id !== lead.id) {
    return {
      ok: false as const,
      message: `Deze website hoort al bij ${existing.company_name || existing.domain}.`,
    };
  }
  if (lead.prospect_id) {
    const { attachProspectWebsite } = await import("@/lib/acquisition");
    const attached = await attachProspectWebsite({
      prospectId: lead.prospect_id,
      website: parsed.normalized,
      actorEmail: input.user.email,
    });
    if (!attached.ok) {
      return { ok: false as const, message: "message" in attached ? attached.message : "Website koppelen is mislukt." };
    }
  }
  await updateLead(lead.id, {
    url: parsed.normalized,
    domain: parsed.domain,
    canonical_url: parsed.canonicalUrl,
    status: lead.prospect_id ? "nieuw" : "scannen",
    last_error: null,
  });
  if (!lead.prospect_id) {
    await enqueuePipelineJob(lead.id, "create");
    after(() =>
      processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
    );
  }
  return { ok: true as const, leadId: lead.id };
}

export async function rescanScoutLead(input: { user: ScoutUser; leadId: string }) {
  const { getLead, appendEvent, updateLead, scoutLeadHasWebsite: hasWebsite } = await import("./leads");
  const lead = await getLead(input.user.id, input.leadId);
  if (!lead) return { ok: false as const, message: "Lead niet gevonden." };
  if (!hasWebsite(lead)) return { ok: false as const, message: "Er is nog geen website om te scannen." };
  const limited = await consumeRateLimit("rescan", input.user.id);
  if (!limited.ok) return { ok: false as const, message: rateLimitMessage(limited.retryAfterSec) };
  await updateLead(lead.id, { status: "scannen", pipeline_stage: "scan", last_error: null });
  await appendEvent({ lead_id: lead.id, event_type: "rescan_requested", actor_type: "human", metadata: {} });
  await enqueuePipelineJob(lead.id, "rescan");
  after(() =>
    processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
  );
  return { ok: true as const, leadId: lead.id };
}

export async function updateScoutLeadProfile(input: {
  user: ScoutUser;
  leadId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  facebookUrl?: string;
  socialUrl?: string;
  note?: string;
}) {
  const lead = await getLead(input.user.id, input.leadId);
  if (!lead) return { ok: false as const, message: "Lead niet gevonden." };
  const profile = profileFromCapture({ ...input, email: lead.email });
  if (!profile.ok) return profile;
  await updateLead(lead.id, {
    first_name: profile.profile.firstName,
    last_name: profile.profile.lastName,
    contact_name: profile.profile.contactName,
    phone: profile.profile.phone,
    city: profile.profile.city,
    facebook_url: profile.profile.facebookUrl,
    social_url: profile.profile.socialUrl,
    note: profile.profile.notes,
  });
  if (lead.prospect_id) {
    const { updateProspectProfile } = await import("@/lib/acquisition");
    const saved = await updateProspectProfile({
      prospectId: lead.prospect_id,
      actorEmail: input.user.email,
      firstName: profile.profile.firstName ?? "",
      lastName: profile.profile.lastName ?? "",
      phone: profile.profile.phone ?? "",
      city: profile.profile.city ?? "",
      notes: profile.profile.notes ?? "",
      facebookUrl: profile.profile.facebookUrl ?? "",
      socialUrl: profile.profile.socialUrl ?? "",
    });
    if (!saved.ok) return saved;
  }
  return { ok: true as const };
}
