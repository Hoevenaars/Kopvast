"use server";

import { revalidatePath } from "next/cache";
import type { OnboardingFormState } from "@/components/workspace/onboarding-checklist";
import { requireSession } from "@/lib/auth";
import { deleteOnboardingFile, saveOnboardingItem, uploadOnboardingFile } from "@/lib/onboarding-store";
import { workspaceRoutes } from "@/lib/product";

async function requireCustomer() {
  const session = await requireSession("customer");
  if (!session?.organizationId) return null;
  return session;
}

function revalidateCustomer() {
  revalidatePath(workspaceRoutes.consoleOnboarding);
  revalidatePath(workspaceRoutes.console);
  revalidatePath(workspaceRoutes.consoleBrand);
  revalidatePath(workspaceRoutes.consolePages);
}

export async function saveCustomerOnboardingItem(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const session = await requireCustomer();
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const result = await saveOnboardingItem({
    itemId: String(formData.get("itemId") ?? ""),
    organizationId: session.organizationId,
    value: String(formData.get("value") ?? ""),
    note: String(formData.get("note") ?? ""),
    notRequired: formData.get("notRequired") === "1",
  });
  if (result.ok) revalidateCustomer();
  return result.ok ? { ok: true, message: "Opgeslagen." } : result;
}

export async function uploadCustomerOnboardingFile(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const session = await requireCustomer();
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const uploaded = formData.get("file");
  if (!(uploaded instanceof File) || uploaded.size === 0) return { ok: false, message: "Kies een bestand." };
  const result = await uploadOnboardingFile({
    itemId: String(formData.get("itemId") ?? ""),
    organizationId: session.organizationId,
    uploadedBy: session.email,
    replace: formData.get("replace") === "1",
    file: {
      name: uploaded.name,
      mime: uploaded.type || "application/octet-stream",
      size: uploaded.size,
      bytes: Buffer.from(await uploaded.arrayBuffer()),
    },
  });
  if (result.ok) revalidateCustomer();
  return result.ok ? { ok: true, message: "Bestand opgeslagen." } : result;
}

export async function deleteCustomerOnboardingFile(
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const session = await requireCustomer();
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const result = await deleteOnboardingFile({
    fileId: String(formData.get("fileId") ?? ""),
    organizationId: session.organizationId,
  });
  if (result.ok) revalidateCustomer();
  return result.ok ? { ok: true, message: "Bestand verwijderd." } : result;
}
