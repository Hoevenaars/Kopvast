"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { convertLead, updateLeadStatus } from "@/lib/workspace";

export async function setLeadStatus(formData: FormData) {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  const id = String(formData.get("id") ?? "");
  await updateLeadStatus(id, String(formData.get("status") ?? ""));
  revalidatePath(`${workspaceRoutes.adminLeads}/${id}`);
  revalidatePath(workspaceRoutes.adminLeads);
  revalidatePath(workspaceRoutes.admin);
}

export async function convertLeadAction(formData: FormData) {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  const id = String(formData.get("id") ?? "");
  const result = await convertLead(id);
  if (result.ok) {
    revalidatePath(workspaceRoutes.admin);
    redirect(`${workspaceRoutes.adminCustomers}/${result.organizationId}`);
  }
  revalidatePath(`${workspaceRoutes.adminLeads}/${id}`);
}
