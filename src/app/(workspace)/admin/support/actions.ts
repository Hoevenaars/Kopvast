"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { updateRequest } from "@/lib/workspace";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
}

export async function saveSupport(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateRequest(String(formData.get("id") ?? ""), {
    status: String(formData.get("status") ?? ""),
    classification: String(formData.get("classification") ?? "") || null,
  });
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminSupport);
  revalidatePath(workspaceRoutes.adminWebsites);
  revalidatePath(workspaceRoutes.adminBeheer);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}
