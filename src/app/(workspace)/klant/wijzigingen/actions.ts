"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { createCustomerRequest, loadCustomerWorkspace } from "@/lib/workspace";
import { hasLiveWebsite } from "@/lib/sites";

export type RequestState = { ok: true } | { ok: false; message: string } | null;

function fileNameFromForm(formData: FormData) {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) return file.name;
  return null;
}

export async function submitRequest(_previous: RequestState, formData: FormData): Promise<RequestState> {
  const session = await requireSession("customer");
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const workspace = await loadCustomerWorkspace(session.organizationId);
  const projectId = String(formData.get("projectId") ?? "").trim();
  const selected = workspace?.projects.find((item) => item.id === projectId);
  const websiteIsLive = selected ? selected.status === "live" : hasLiveWebsite(workspace?.projects ?? []);
  const result = await createCustomerRequest({
    organizationId: session.organizationId,
    email: session.email,
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    projectId: projectId || null,
    fileName: fileNameFromForm(formData),
    source: String(formData.get("source") ?? "") === "support" ? "support" : "wijziging",
    websiteIsLive,
  });
  if (result.ok) {
    revalidatePath(workspaceRoutes.consoleRequests);
    revalidatePath(workspaceRoutes.consoleSupport);
    revalidatePath(workspaceRoutes.console);
  }
  return result;
}
