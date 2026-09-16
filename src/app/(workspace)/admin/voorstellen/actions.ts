"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { createProposal, draftFromForm, saveProposalDraft, sendProposal } from "@/lib/proposal-ops";

export type ProposalActionState = { ok: boolean; message: string } | null;

async function requireAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminProposals}`);
  return session;
}

function revalidateProposal(id?: string) {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminProposals);
  revalidatePath(workspaceRoutes.adminTaken);
  if (id) {
    revalidatePath(`${workspaceRoutes.adminProposals}/${id}`);
    revalidatePath(`${workspaceRoutes.adminProposals}/${id}/preview`);
  }
}

export async function createProposalAction(formData: FormData) {
  const session = await requireAdmin();
  const result = await createProposal({
    type: String(formData.get("type") ?? "maatwerk"),
    recipientName: String(formData.get("recipient_name") ?? ""),
    recipientEmail: String(formData.get("recipient_email") ?? ""),
    recipientOrganization: String(formData.get("recipient_organization") ?? ""),
    leadId: String(formData.get("lead_id") ?? "") || null,
    organizationId: String(formData.get("organization_id") ?? "") || null,
    createdBy: session.email,
  });
  if (!result.ok) redirect(`${workspaceRoutes.adminProposalsNew}?fout=${encodeURIComponent(result.message)}`);
  revalidateProposal(result.id);
  redirect(`${workspaceRoutes.adminProposals}/${result.id}`);
}

export async function saveProposalAction(
  _previous: ProposalActionState,
  formData: FormData
): Promise<ProposalActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await saveProposalDraft(id, draftFromForm(formData), session.email);
  revalidateProposal(id);
  return result.ok ? { ok: true, message: "Opgeslagen." } : { ok: false, message: result.message };
}

export async function sendProposalAction(
  _previous: ProposalActionState,
  formData: FormData
): Promise<ProposalActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await sendProposal(id, draftFromForm(formData), session.email);
  revalidateProposal(id);
  if (!result.ok) return { ok: false, message: result.message };
  if (!result.mailed) return { ok: true, message: result.message || "Voorstel vastgezet. Mail is niet verzonden." };
  return { ok: true, message: "Voorstel verzonden." };
}
