"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSessionsForEmail, requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { setMemberAccess } from "@/lib/workspace";

export async function saveMemberAccess(formData: FormData) {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);

  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const enabled = formData.get("access") === "1";
  const result = await setMemberAccess(id, enabled);
  if (result.ok && !enabled) await endSessionsForEmail(result.email);

  revalidatePath(workspaceRoutes.adminUsers);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}
