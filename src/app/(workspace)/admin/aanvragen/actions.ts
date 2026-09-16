"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  createDraftProposal,
  createManualAanvraag,
  saveAanvraagCallNote,
  saveAanvraagNextAction,
  saveProposalDraft,
  updateAanvraagQualification,
} from "@/lib/aanvragen";
import { workspaceRoutes } from "@/lib/product";
import { convertLead } from "@/lib/workspace";

async function requireAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  return session;
}

function revalidateAanvraag(id: string) {
  revalidatePath(workspaceRoutes.adminAanvragen);
  revalidatePath(`${workspaceRoutes.adminAanvragen}/${id}`);
  revalidatePath(workspaceRoutes.admin);
}

export async function createManualAanvraagAction(_previous: { ok: false; message: string } | null, formData: FormData) {
  const session = await requireAdmin();
  const result = await createManualAanvraag({
    company: String(formData.get("company") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    website: String(formData.get("website") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    productFit: String(formData.get("productFit") ?? ""),
    status: String(formData.get("status") ?? ""),
    actorEmail: session.email,
  });
  if (!result.ok) return result;
  revalidateAanvraag(result.id);
  redirect(`${workspaceRoutes.adminAanvragen}/${result.id}`);
}

export async function updateQualificationAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await updateAanvraagQualification({
    id,
    status: String(formData.get("status") ?? ""),
    productFit: String(formData.get("productFit") ?? ""),
    qualificationNotes: String(formData.get("qualificationNotes") ?? ""),
    actorEmail: session.email,
  });
  revalidateAanvraag(id);
}

export async function saveCallNoteAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await saveAanvraagCallNote({
    id,
    callNotes: String(formData.get("callNotes") ?? ""),
    actorEmail: session.email,
  });
  revalidateAanvraag(id);
}

export async function saveNextActionForm(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await saveAanvraagNextAction({
    id,
    nextAction: String(formData.get("nextAction") ?? ""),
    nextActionAt: String(formData.get("nextActionAt") ?? ""),
    actorEmail: session.email,
  });
  revalidateAanvraag(id);
}

export async function createProposalAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await createDraftProposal({ leadId: id, actorEmail: session.email });
  revalidateAanvraag(id);
  if (result.ok) {
    revalidatePath(`${workspaceRoutes.adminVoorstellen}/${result.id}`);
    redirect(`${workspaceRoutes.adminVoorstellen}/${result.id}`);
  }
}

export async function convertAanvraagAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await convertLead(id);
  if (result.ok) {
    revalidatePath(workspaceRoutes.admin);
    revalidatePath(workspaceRoutes.adminInvoices);
    revalidatePath(workspaceRoutes.consoleInvoices);
    revalidateAanvraag(id);
    redirect(`${workspaceRoutes.adminCustomers}/${result.organizationId}`);
  }
  revalidateAanvraag(id);
}

export async function saveProposalAction(
  _previous: { ok: true } | { ok: false; message: string } | null,
  formData: FormData
) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const titles = formData.getAll("lineTitle").map((item) => String(item));
  const descriptions = formData.getAll("lineDescription").map((item) => String(item));
  const amounts = formData.getAll("lineAmount").map((item) => String(item));
  const cadences = formData.getAll("lineCadence").map((item) => String(item));
  const lines = titles.map((title, index) => ({
    title,
    description: descriptions[index] ?? "",
    amount_label: amounts[index] ?? "",
    cadence: cadences[index] ?? "",
  }));
  const result = await saveProposalDraft({
    id,
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    lines,
    actorEmail: session.email,
  });
  const leadId = String(formData.get("leadId") ?? "");
  if (leadId) revalidateAanvraag(leadId);
  revalidatePath(`${workspaceRoutes.adminVoorstellen}/${id}`);
  return result;
}
