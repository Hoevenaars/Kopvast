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
