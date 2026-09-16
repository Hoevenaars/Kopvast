"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { nowIso } from "@/lib/workspace-store";
import { updateProject } from "@/lib/workspace";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
}

function revalidateBeheer(organizationId?: string) {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminBeheer);
  revalidatePath(workspaceRoutes.adminWebsites);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function saveBeheer(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const amountRaw = String(formData.get("monthlyAmount") ?? "").replace(",", ".");
  const monthly = Number(amountRaw);
  await updateProject(id, {
    status: String(formData.get("status") ?? ""),
    monthly_amount: Number.isFinite(monthly) && amountRaw.trim() ? monthly : null,
    included_note: String(formData.get("includedNote") ?? ""),
    started_at: String(formData.get("startedAt") ?? ""),
  });
  revalidateBeheer(organizationId);
}

export async function markBeheerChecked(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateProject(id, { last_checked_at: nowIso() });
  revalidateBeheer(organizationId);
}
