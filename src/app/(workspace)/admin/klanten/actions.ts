"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { addAsset, updateOrganization, updateProjectStatus, updateRequestStatus } from "@/lib/workspace";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  return session;
}

export async function saveOrganization(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrganization(id, {
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath(`${workspaceRoutes.adminCustomers}/${id}`);
}

export async function saveProjectStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateProjectStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function saveRequestStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateRequestStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function saveAsset(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await addAsset({
    organizationId,
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    url: String(formData.get("url") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}
