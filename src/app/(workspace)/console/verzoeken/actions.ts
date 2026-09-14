"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { createCustomerRequest } from "@/lib/workspace";

export type RequestState = { ok: true } | { ok: false; message: string } | null;

export async function submitRequest(_previous: RequestState, formData: FormData): Promise<RequestState> {
  const session = await requireSession("customer");
  if (!session?.organizationId) return { ok: false, message: "Je bent niet ingelogd." };
  const result = await createCustomerRequest({
    organizationId: session.organizationId,
    email: session.email,
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (result.ok) revalidatePath(workspaceRoutes.consoleRequests);
  return result;
}
