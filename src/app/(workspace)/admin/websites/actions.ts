"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { updateProject, updateRequest } from "@/lib/workspace";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
}

function revalidateSite(organizationId?: string, websiteId?: string) {
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminWebsites);
  revalidatePath(workspaceRoutes.adminBeheer);
  revalidatePath(workspaceRoutes.adminSupport);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
  if (websiteId) revalidatePath(`${workspaceRoutes.adminWebsites}/${websiteId}`);
}

export async function saveWebsite(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateProject(id, {
    status: String(formData.get("status") ?? ""),
    primary_domain: String(formData.get("primaryDomain") ?? ""),
    preview_url: String(formData.get("previewUrl") ?? ""),
    production_url: String(formData.get("productionUrl") ?? ""),
    technical_note: String(formData.get("technicalNote") ?? ""),
  });
  revalidateSite(organizationId, id);
}

export async function saveLinkedBeheer(formData: FormData) {
  await guard();
  const beheerId = String(formData.get("beheerId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!beheerId) return;
  await updateProject(beheerId, { status: String(formData.get("status") ?? "") });
  revalidateSite(organizationId, websiteId);
}

export async function saveLinkedRequest(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  const websiteId = String(formData.get("websiteId") ?? "");
  await updateRequest(String(formData.get("id") ?? ""), {
    status: String(formData.get("status") ?? ""),
  });
  revalidateSite(organizationId, websiteId);
}
