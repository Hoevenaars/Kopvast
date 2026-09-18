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
import { pushScoutLead, rescanScoutLead } from "@/lib/scout/capture";
import { interpretScoutPhoto } from "@/lib/scout/camera";
import { approveDraft, getLead, saveDraft } from "@/lib/scout/leads";
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
    source: inferSource({ source: String(formData.get("source") ?? "") }),
    forceRescanOf: String(formData.get("rescanId") ?? "") || undefined,
  });
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

export async function saveDraftAction(formData: FormData) {
  const user = await requireScoutUser();
  const leadId = String(formData.get("leadId") ?? "");
  await saveDraft(user.id, leadId, {
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  const base = await scoutPublicBase();
  redirect(withBase(base, `/leads/${leadId}`));
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
