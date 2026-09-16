"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { createChangeRequest, recordApproval } from "@/lib/production-board";

export type CustomerActionState = { ok: true } | { ok: false; message: string } | null;

function revalidateProduction(id: string, organizationId: string) {
  revalidatePath(workspaceRoutes.adminProductie);
  revalidatePath(`${workspaceRoutes.adminProductie}/${id}`);
  revalidatePath(workspaceRoutes.console);
  revalidatePath(workspaceRoutes.consoleWebsite);
  revalidatePath(workspaceRoutes.consoleApprovals);
  revalidatePath(workspaceRoutes.consoleRequests);
  revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function submitConceptApproval(
  _previous: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await requireSession("customer");
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const productionId = String(formData.get("productionId") ?? "");
  const result = await recordApproval({
    productionId,
    organizationId: session.organizationId,
    kind: "concept",
    name: String(formData.get("name") ?? ""),
    email: session.email,
  });
  if (result.ok) revalidateProduction(productionId, session.organizationId);
  return result;
}

export async function submitFinalApproval(
  _previous: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await requireSession("customer");
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const productionId = String(formData.get("productionId") ?? "");
  const result = await recordApproval({
    productionId,
    organizationId: session.organizationId,
    kind: "final",
    name: String(formData.get("name") ?? ""),
    email: session.email,
  });
  if (result.ok) revalidateProduction(productionId, session.organizationId);
  return result;
}

export async function submitProductionChange(
  _previous: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await requireSession("customer");
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const productionId = String(formData.get("productionId") ?? "");
  const result = await createChangeRequest({
    productionId,
    organizationId: session.organizationId,
    email: session.email,
    pageSection: String(formData.get("pageSection") ?? ""),
    body: String(formData.get("body") ?? ""),
    fileUrl: String(formData.get("fileUrl") ?? ""),
  });
  if (result.ok) revalidateProduction(productionId, session.organizationId);
  return result;
}
