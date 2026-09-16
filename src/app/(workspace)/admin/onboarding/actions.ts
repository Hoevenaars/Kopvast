"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OnboardingFormState } from "@/components/workspace/onboarding-checklist";
import { requireSession } from "@/lib/auth";
import {
  addCustomOnboardingItem,
  clearOnboardingOverride,
  deleteCustomOnboardingItem,
  deleteOnboardingFile,
  overrideOnboardingReady,
  reviewOnboardingItem,
  saveOnboardingItem,
  uploadOnboardingFile,
} from "@/lib/onboarding-store";
import { workspaceRoutes } from "@/lib/product";

async function requireAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminOnboarding}`);
  return session;
}

function pathsFor(projectId: string, organizationId?: string) {
  revalidatePath(workspaceRoutes.adminOnboarding);
  revalidatePath(`${workspaceRoutes.adminOrders}/${projectId}/onboarding`);
  revalidatePath(workspaceRoutes.consoleOnboarding);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

async function fileFromForm(formData: FormData) {
  const uploaded = formData.get("file");
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return { ok: false as const, message: "Kies een bestand." };
  }
  return {
    ok: true as const,
    file: {
      name: uploaded.name,
      mime: uploaded.type || "application/octet-stream",
      size: uploaded.size,
      bytes: Buffer.from(await uploaded.arrayBuffer()),
    },
  };
}

export async function saveOnboardingItemAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await saveOnboardingItem({
    itemId: String(formData.get("itemId") ?? ""),
    organizationId,
    value: String(formData.get("value") ?? ""),
    note: String(formData.get("note") ?? ""),
    notRequired: formData.get("notRequired") === "1",
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""), organizationId);
  return { ok: true, message: "Opgeslagen." };
}

export async function uploadOnboardingFileAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const session = await requireAdmin();
  const parsed = await fileFromForm(formData);
  if (!parsed.ok) return parsed;
  const itemId = String(formData.get("itemId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await uploadOnboardingFile({
    itemId,
    organizationId,
    uploadedBy: session.email,
    replace: formData.get("replace") === "1",
    file: parsed.file,
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""), organizationId);
  return { ok: true, message: "Bestand opgeslagen." };
}

export async function deleteOnboardingFileAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await deleteOnboardingFile({
    fileId: String(formData.get("fileId") ?? ""),
    organizationId,
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""), organizationId);
  return { ok: true, message: "Bestand verwijderd." };
}

export async function reviewOnboardingItemAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const status = String(formData.get("status") ?? "");
  if (status !== "approved" && status !== "rejected" && status !== "not_required" && status !== "missing") {
    return { ok: false, message: "Onbekende beoordeling." };
  }
  const result = await reviewOnboardingItem({
    itemId: String(formData.get("itemId") ?? ""),
    status,
    adminNote: String(formData.get("adminNote") ?? ""),
    required: formData.get("required") === "1",
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""));
  return { ok: true, message: "Beoordeling opgeslagen." };
}

export async function addCustomOnboardingItemAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const result = await addCustomOnboardingItem({
    onboardingId: String(formData.get("onboardingId") ?? ""),
    title: String(formData.get("title") ?? ""),
    section: String(formData.get("section") ?? "maatwerk"),
    itemType: String(formData.get("itemType") ?? "textarea"),
    required: formData.get("required") === "1",
    helpText: String(formData.get("helpText") ?? ""),
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""));
  return { ok: true, message: "Item toegevoegd." };
}

export async function deleteCustomOnboardingItemAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const result = await deleteCustomOnboardingItem(String(formData.get("itemId") ?? ""));
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""));
  return { ok: true, message: "Item verwijderd." };
}

export async function overrideOnboardingAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const session = await requireAdmin();
  const result = await overrideOnboardingReady({
    onboardingId: String(formData.get("onboardingId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    actorEmail: session.email,
  });
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""));
  return { ok: true, message: "Onboarding klaargezet met override." };
}

export async function clearOnboardingOverrideAction(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireAdmin();
  const result = await clearOnboardingOverride(String(formData.get("onboardingId") ?? ""));
  if (!result.ok) return result;
  pathsFor(String(formData.get("projectId") ?? ""));
  return { ok: true, message: "Override ingetrokken." };
}
