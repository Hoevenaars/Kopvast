"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { allowDevLogin } from "@/lib/auth";
import { originAllowed } from "@/lib/scout/config";
import {
  clearScoutSession,
  loginScoutWithPassword,
  requestScoutLogin,
  requireScoutUser,
  verifyScoutLoginCode,
} from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { attachScoutWebsite, pushScoutLead, rescanScoutLead, updateScoutLeadProfile } from "@/lib/scout/capture";
import { interpretScoutPhoto } from "@/lib/scout/camera";
import {
  ensureUnreachableSiteMail,
  generateAndSendManualReasonsMail,
  generateManualReasonsMail,
  sendProspectLiveMail,
} from "@/lib/acquisition-send";
import { loadProspectDetail } from "@/lib/acquisition";
import { isUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";
import { buildPersonalApproachLetter } from "@/lib/acquisition/outreach-policy";
import { greetingForContact, knownFirstName } from "@/lib/prospect-profile";
import { isContentOfferReason, isGeographicOfferReason } from "@/lib/acquisition/special-offer-rules";
import { approveDraft, getLead, saveDraft, scoutLeadHasWebsite, updateScoutLeadCompanyName, updateScoutLeadEmail } from "@/lib/scout/leads";
import { syncProspectFromScout } from "@/lib/scout/crm";
import { ensureScoutUnreachableDraft } from "@/lib/scout/unreachable";
import { consumeRateLimit, rateLimitMessage } from "@/lib/scout/rate-limit";
import { inferSource } from "@/lib/scout/urls";
import type { DuplicateLead } from "@/lib/scout/types";

function assertSameOrigin(headerList: Headers) {
  const origin = headerList.get("origin");
  if (origin && !originAllowed(origin)) {
    throw new Error("Ongeldige herkomst.");
  }
}

export type ScoutPushState =
  | { ok: true; leadId: string }
  | { ok: false; message: string }
  | { ok: false; duplicate: true; existing: DuplicateLead }
  | null;

export type ScoutLoginState =
  | { ok: true; emailed?: boolean; needsCode?: boolean; email?: string; devCode?: string }
  | { ok: false; message: string; needsCode?: boolean; email?: string; devCode?: string }
  | null;

export async function pushLeadAction(_prev: ScoutPushState, formData: FormData): Promise<ScoutPushState> {
  assertSameOrigin(await headers());
  let user;
  try {
    user = await requireScoutUser();
  } catch {
    const base = await scoutPublicBase();
    redirect(withBase(base, "/login"));
  }
  return pushScoutLead({
    user,
    website: String(formData.get("website") ?? ""),
    note: String(formData.get("note") ?? ""),
    email: String(formData.get("email") ?? ""),
    source: inferSource({ source: String(formData.get("source") ?? "") }),
    forceRescanOf: String(formData.get("rescanId") ?? "") || undefined,
    hasWebsite: String(formData.get("hasWebsite") ?? "ja") !== "nee",
    company: String(formData.get("company") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    socialUrl: String(formData.get("socialUrl") ?? ""),
    city: String(formData.get("city") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
  });
}

export async function attachScoutWebsiteAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const result = await attachScoutWebsite({
    user,
    leadId,
    website: String(formData.get("website") ?? ""),
  });
  const base = await scoutPublicBase();
  if (!result.ok) {
    redirect(withBase(base, `/leads/${leadId}?error=${encodeURIComponent(result.message)}`));
  }
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function pushLeadFormAction(formData: FormData) {
  await pushLeadAction(null, formData);
}

export async function rescanAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  await rescanScoutLead({ user, leadId });
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
}

export type ScoutEmailState =
  | { ok: true; email: string }
  | { ok: false; message: string }
  | null;

export type ScoutCompanyState =
  | { ok: true; company: string }
  | { ok: false; message: string }
  | null;

export async function updateScoutEmailAction(_prev: ScoutEmailState, formData: FormData): Promise<ScoutEmailState> {
  assertSameOrigin(await headers());
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const result = await updateScoutLeadEmail(user, leadId, String(formData.get("email") ?? ""));
  if (!result.ok) {
    if ("emailConflict" in result && result.emailConflict) {
      return { ok: false, message: `Dit e-mailadres hoort al bij ${result.existing.company_name || result.existing.domain}.` };
    }
    return { ok: false, message: "message" in result ? result.message : "E-mail opslaan is mislukt." };
  }
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function updateScoutCompanyAction(_prev: ScoutCompanyState, formData: FormData): Promise<ScoutCompanyState> {
  assertSameOrigin(await headers());
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const result = await updateScoutLeadCompanyName(user, leadId, String(formData.get("company") ?? ""));
  if (!result.ok) {
    return { ok: false, message: "message" in result ? result.message : "Naam opslaan is mislukt." };
  }
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function applyScoutApproachAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const base = await scoutPublicBase();
  const lead = await getLead(user.id, leadId);
  if (!lead) redirect(withBase(base, `/leads/${leadId}?error=${encodeURIComponent("Lead niet gevonden.")}`));
  const geographicRaw = String(formData.get("geographicReason") ?? "");
  const contentRaw = String(formData.get("contentReason") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();
  const geographicReason = isGeographicOfferReason(geographicRaw) ? geographicRaw : null;
  const contentReason = isContentOfferReason(contentRaw) ? contentRaw : null;
  const letter = buildPersonalApproachLetter({
    companyName: lead.company_name,
    domain: lead.domain,
    place: lead.city,
    websitePresence: scoutLeadHasWebsite(lead) ? "HAS_WEBSITE" : "NO_WEBSITE",
    greeting: greetingForContact(knownFirstName({ firstName: lead.first_name, contactName: lead.contact_name })),
    manualReasons: { geographicReason, contentReason },
    contentEvidence:
      contentReason && evidence
        ? [
            {
              reason: contentReason,
              evidence,
              confidence: 1,
              sourceKind: lead.facebook_url ? "facebook" : "manual_note",
              sourceUrl: lead.facebook_url ?? undefined,
            },
          ]
        : [],
  });
  await saveDraft(user.id, leadId, { subject: letter.subject, message: letter.body });
  await syncProspectFromScout(leadId);
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function updateScoutProfileAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const base = await scoutPublicBase();
  const result = await updateScoutLeadProfile({
    user,
    leadId,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    socialUrl: String(formData.get("socialUrl") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!result.ok) redirect(withBase(base, `/leads/${leadId}?error=${encodeURIComponent(result.message)}`));
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function saveDraftAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  await saveDraft(user.id, leadId, {
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  await syncProspectFromScout(leadId);
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function createUnreachableDraftAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const lead = await getLead(user.id, leadId);
  if (!lead) throw new Error("Lead niet gevonden.");
  if (!lead.email) throw new Error("Voeg eerst een e-mailadres toe.");
  await ensureScoutUnreachableDraft(lead);
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function sendScoutMailAction(formData: FormData) {
  const user = await requireScoutUser();
  const base = await scoutPublicBase();
  const leadId = String(formData.get("leadId") ?? "");
  const errorPath = (message: string) => withBase(base, `/leads/${leadId}?error=${encodeURIComponent(message)}`);
  const lead = await getLead(user.id, leadId);
  if (!lead) redirect(errorPath("Lead niet gevonden."));
  if (!lead.email) redirect(errorPath("Voeg eerst een e-mailadres toe."));
  await saveDraft(user.id, leadId, {
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  }).catch(() => undefined);
  await syncProspectFromScout(leadId);
  if (!lead.prospect_id) redirect(errorPath("Deze lead staat nog niet in Acquisitie."));
  const detail = await loadProspectDetail(lead.prospect_id);
  const existing = detail?.mail;
  const mailId =
    existing && existing.status === "draft" && !isUnreachableSiteMail(existing.body_text)
      ? existing.id
      : null;
  const ensured = mailId
    ? { ok: true as const, mailId }
    : await ensureUnreachableSiteMail(lead.prospect_id, user.email);
  if (!ensured.ok) redirect(errorPath(ensured.message));
  const sent = await sendProspectLiveMail({
    prospectId: lead.prospect_id,
    mailId: ensured.mailId,
    actorEmail: user.email,
    humanReviewed: String(formData.get("reviewed") ?? "") === "ja",
  });
  if (!sent.ok) redirect(errorPath("message" in sent ? sent.message : "Versturen is mislukt."));
  redirect(withBase(base, `/leads/${leadId}`));
}

export async function createManualReasonsMailScoutAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const lead = await getLead(user.id, leadId);
  if (!lead) return { ok: false as const, message: "Lead niet gevonden." };
  if (!lead.prospect_id) return { ok: false as const, message: "Deze lead staat nog niet in Acquisitie." };
  const reasons = formData.getAll("reason").map(String);
  const intent = String(formData.get("intent") ?? "send");
  const result =
    intent === "draft"
      ? await generateManualReasonsMail({ prospectId: lead.prospect_id, reasons, actorEmail: user.email })
      : await generateAndSendManualReasonsMail({
          prospectId: lead.prospect_id,
          reasons,
          actorEmail: user.email,
        });
  return result;
}

export async function approveDraftAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  const lead = await getLead(user.id, leadId);
  if (lead) {
    await saveDraft(user.id, leadId, {
      subject: String(formData.get("subject") ?? lead.company_name ?? ""),
      message: String(formData.get("message") ?? ""),
    }).catch(() => undefined);
  }
  await approveDraft(user.id, leadId);
  const base = await scoutPublicBase();
  redirect(withBase(base, `/concepten`));
}

export async function scoutLoginAction(_prev: ScoutLoginState, formData: FormData): Promise<ScoutLoginState> {
  const limited = await consumeRateLimit("login", String(formData.get("email") ?? "anon"));
  if (!limited.ok) return { ok: false, message: rateLimitMessage(limited.retryAfterSec) };

  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "");
  const intent = String(formData.get("intent") ?? "password");
  const result =
    intent === "code"
      ? await requestScoutLogin(email)
      : intent === "verify-code"
        ? await verifyScoutLoginCode(email, String(formData.get("code") ?? ""))
        : await loginScoutWithPassword(email, String(formData.get("password") ?? ""));

  if (!result.ok) {
    return {
      ...result,
      needsCode: Boolean(result.needsCode || formData.get("awaitingCode") === "1"),
      email,
      devCode: allowDevLogin() ? result.devCode : undefined,
    };
  }
  if (!result.needsCode) {
    const base = await scoutPublicBase();
    redirect(next || withBase(base, "/"));
  }
  return {
    ok: true,
    emailed: result.emailed,
    needsCode: true,
    email,
    devCode: allowDevLogin() ? result.devCode : undefined,
  };
}

export async function scoutLogoutAction() {
  await clearScoutSession();
  const base = await scoutPublicBase();
  redirect(withBase(base, "/login"));
}

export async function cameraInterpretAction(formData: FormData) {
  const user = await requireScoutUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || !file.size) {
    return { ok: false as const, message: "Kies een foto." };
  }
  return interpretScoutPhoto(user, file);
}
