"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { acquireAdminScan } from "@/lib/acquire";
import {
  convertProspectToLead,
  createAcquisitionProspect,
  reuseProspectScan,
  updateProspectFollowUp,
  type CreateProspectResult,
} from "@/lib/acquisition";
import {
  regenerateProspectMail,
  saveProspectMailDraft,
  sendProspectLiveMail,
  sendProspectTestMail,
} from "@/lib/acquisition-send";

async function requireAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminAcquisition}`);
  return session;
}

function revalidateAcquisition(id?: string) {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminAcquisition);
  if (id) revalidatePath(`${workspaceRoutes.adminAcquisition}/${id}`);
}

export async function createProspectAction(
  _previous: CreateProspectResult | null,
  formData: FormData
): Promise<CreateProspectResult> {
  const session = await requireAdmin();
  const result = await createAcquisitionProspect({
    website: String(formData.get("website") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    actorEmail: session.email,
  });
  if (result.ok) {
    after(() =>
      acquireAdminScan({
        prospectId: result.prospectId,
        scanId: result.scanId,
        website: String(formData.get("website") ?? ""),
        force: true,
      }).catch((error) => console.error("[kopvast] Admin-scan mislukt", error))
    );
    revalidateAcquisition(result.prospectId);
    redirect(`${workspaceRoutes.adminAcquisition}/${result.prospectId}`);
  }
  return result;
}

export async function reuseProspectAction(formData: FormData) {
  const session = await requireAdmin();
  const result = await reuseProspectScan({
    prospectId: String(formData.get("prospectId") ?? ""),
    website: String(formData.get("website") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    actorEmail: session.email,
  });
  if (result.ok) {
    after(() =>
      acquireAdminScan({
        prospectId: result.prospectId,
        scanId: result.scanId,
        website: String(formData.get("website") ?? ""),
        force: true,
      }).catch((error) => console.error("[kopvast] Admin-scan mislukt", error))
    );
    revalidateAcquisition(result.prospectId);
    redirect(`${workspaceRoutes.adminAcquisition}/${result.prospectId}`);
  }
  if ("emailConflict" in result && result.emailConflict) {
    redirect(`${workspaceRoutes.adminAcquisition}/${result.existing.id}?conflict=email`);
  }
  redirect(`${workspaceRoutes.adminAcquisitionNew}?fout=scan`);
}

export async function saveMailAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const result = await saveProspectMailDraft({
    prospectId,
    mailId: String(formData.get("mailId") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    actorEmail: session.email,
  });
  revalidateAcquisition(prospectId);
  return result;
}

export async function regenerateMailAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const result = await regenerateProspectMail(prospectId, session.email);
  revalidateAcquisition(prospectId);
  return result;
}

async function persistDraftIfPresent(formData: FormData, actorEmail: string) {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) return { ok: true as const };
  return saveProspectMailDraft({
    prospectId: String(formData.get("prospectId") ?? ""),
    mailId: String(formData.get("mailId") ?? ""),
    subject,
    body,
    actorEmail,
  });
}

export async function sendTestMailAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const saved = await persistDraftIfPresent(formData, session.email);
  if (!saved.ok) {
    revalidateAcquisition(prospectId);
    return saved;
  }
  const result = await sendProspectTestMail({
    prospectId,
    mailId: String(formData.get("mailId") ?? ""),
    actorEmail: session.email,
  });
  revalidateAcquisition(prospectId);
  return result;
}

export async function sendLiveMailAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const saved = await persistDraftIfPresent(formData, session.email);
  if (!saved.ok) {
    revalidateAcquisition(prospectId);
    return saved;
  }
  const result = await sendProspectLiveMail({
    prospectId,
    mailId: String(formData.get("mailId") ?? ""),
    actorEmail: session.email,
  });
  revalidateAcquisition(prospectId);
  return result;
}

export async function updateFollowUpAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const result = await updateProspectFollowUp({
    prospectId,
    responseStatus: String(formData.get("responseStatus") ?? "") || undefined,
    nextAction: String(formData.get("nextAction") ?? ""),
    nextActionAt: String(formData.get("nextActionAt") ?? ""),
    actorEmail: session.email,
  });
  revalidateAcquisition(prospectId);
  return result;
}

export async function convertProspectAction(formData: FormData) {
  const session = await requireAdmin();
  const prospectId = String(formData.get("prospectId") ?? "");
  const result = await convertProspectToLead({ prospectId, actorEmail: session.email });
  revalidateAcquisition(prospectId);
  revalidatePath(workspaceRoutes.adminLeads);
  if (result.ok) redirect(`${workspaceRoutes.adminLeads}/${result.leadId}`);
  return result;
}

export async function updateFollowUpForm(formData: FormData): Promise<void> {
  await updateFollowUpAction(formData);
}

export async function convertProspectForm(formData: FormData): Promise<void> {
  await convertProspectAction(formData);
}

export async function rescanProspectAction(formData: FormData): Promise<void> {
  await reuseProspectAction(formData);
}
