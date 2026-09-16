"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import {
  markOnboardingComplete,
  markProductionLive,
  resubmitForReview,
  saveLaunchCheck,
  saveProductionMeta,
  sendToClientReview,
  startProduction,
  updateChangeRequestStatus,
} from "@/lib/production-board";

async function guardAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  return session;
}

function productionPath(id: string, query?: string) {
  return `${workspaceRoutes.adminProductie}/${id}${query ? `?${query}` : ""}`;
}

function revalidateProduction(id: string, organizationId?: string) {
  revalidatePath(workspaceRoutes.adminProductie);
  revalidatePath(`${workspaceRoutes.adminProductie}/${id}`);
  revalidatePath(workspaceRoutes.console);
  revalidatePath(workspaceRoutes.consoleWebsite);
  revalidatePath(workspaceRoutes.consoleApprovals);
  revalidatePath(workspaceRoutes.consoleRequests);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function saveProductionMetaAction(formData: FormData) {
  await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await saveProductionMeta(id, {
    scope: String(formData.get("scope") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
    blockers: String(formData.get("blockers") ?? ""),
  });
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function markOnboardingAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await markOnboardingComplete(id, session.email);
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function startProductionAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await startProduction(id, session.email);
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function sendToReviewAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await sendToClientReview(
    id,
    {
      previewUrl: String(formData.get("previewUrl") ?? ""),
      reviewMessage: String(formData.get("reviewMessage") ?? ""),
    },
    session.email
  );
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function resubmitReviewAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await resubmitForReview(id, session.email);
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function saveChangeStatusAction(formData: FormData) {
  const session = await guardAdmin();
  const result = await updateChangeRequestStatus(
    String(formData.get("id") ?? ""),
    String(formData.get("status") ?? ""),
    session.email
  );
  if (!result.ok) {
    const productionId = String(formData.get("productionId") ?? "");
    redirect(productionPath(productionId, `fout=${encodeURIComponent(result.message)}`));
  }
  revalidateProduction(result.productionId);
}

export async function saveLaunchCheckAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await saveLaunchCheck(
    id,
    String(formData.get("key") ?? ""),
    String(formData.get("checked") ?? "") === "1",
    session.email
  );
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

export async function markLiveAction(formData: FormData) {
  const session = await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await markProductionLive(id, session.email);
  revalidateProduction(id, String(formData.get("organizationId") ?? "") || undefined);
  if (!result.ok) redirect(productionPath(id, `fout=${encodeURIComponent(result.message)}`));
}

