"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  isMailTemplateKey,
  saveMailTemplate,
  type MailTemplateFields,
  type MailTemplateKey,
} from "@/lib/mail-templates";
import { workspaceRoutes } from "@/lib/product";
import {
  CLEAR_ACQUISITION_CONFIRM,
  LIVE_MODE_CONFIRM,
  TEST_MODE_CONFIRM,
  clearAcquisitionWorkspace,
  matchesConfirm,
} from "@/lib/acquisition-ops";
import { isEmailMode, saveEmailMode } from "@/lib/email-mode";

export type MailTemplateState =
  | { ok: true; key: MailTemplateKey; message: string }
  | { ok: false; key?: MailTemplateKey; message: string }
  | null;

export async function saveMailTemplateAction(
  _previous: MailTemplateState,
  formData: FormData
): Promise<MailTemplateState> {
  const session = await requireSession("admin");
  if (!session) return { ok: false, message: "Je bent niet ingelogd." };

  const key = String(formData.get("key") ?? "");
  if (!isMailTemplateKey(key)) return { ok: false, message: "Onbekend template." };

  const fields: MailTemplateFields = {};
  for (const [name, value] of formData.entries()) {
    if (name === "key" || typeof value !== "string") continue;
    fields[name] = value;
  }

  const result = await saveMailTemplate({ key, fields, actorEmail: session.email });
  if (!result.ok) return { ok: false, key, message: result.message };
  revalidatePath(workspaceRoutes.adminSettings);
  return { ok: true, key, message: "Template opgeslagen. Nieuwe mails gebruiken deze tekst." };
}

export type AcquisitionOpsState = { ok: boolean; message: string } | null;

function revalidateAcquisitionOps() {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminAcquisition);
  revalidatePath(workspaceRoutes.adminLeads);
  revalidatePath(workspaceRoutes.adminMail);
  revalidatePath(workspaceRoutes.adminSettings);
}

export async function setAcquisitionEmailModeAction(
  _previous: AcquisitionOpsState,
  formData: FormData
): Promise<AcquisitionOpsState> {
  const session = await requireSession("admin");
  if (!session) return { ok: false, message: "Je bent niet ingelogd." };

  const mode = String(formData.get("mode") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!isEmailMode(mode)) return { ok: false, message: "Onbekende modus." };

  const expected = mode === "LIVE" ? LIVE_MODE_CONFIRM : TEST_MODE_CONFIRM;
  if (!matchesConfirm(confirm, expected)) {
    return { ok: false, message: `Typ ${expected} om te bevestigen.` };
  }

  const result = await saveEmailMode(mode);
  if (!result.ok) return result;
  revalidateAcquisitionOps();
  return {
    ok: true,
    message: mode === "LIVE" ? "LIVE acquisitie staat aan. Mails gaan naar het prospectadres." : "TEST MODE staat weer aan.",
  };
}

export async function clearAcquisitionWorkspaceAction(
  _previous: AcquisitionOpsState,
  formData: FormData
): Promise<AcquisitionOpsState> {
  const session = await requireSession("admin");
  if (!session) return { ok: false, message: "Je bent niet ingelogd." };

  if (!matchesConfirm(String(formData.get("confirm") ?? ""), CLEAR_ACQUISITION_CONFIRM)) {
    return { ok: false, message: `Typ ${CLEAR_ACQUISITION_CONFIRM} om te bevestigen.` };
  }

  const result = await clearAcquisitionWorkspace();
  if (!result.ok) return result;
  revalidateAcquisitionOps();
  return {
    ok: true,
    message: `Omgeving geleegd: ${result.prospects} prospects, ${result.leads} aanvragen, ${result.mails} mails.`,
  };
}
