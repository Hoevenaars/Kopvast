"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import {
  createOrderFromAgreement,
  updateOnboardingProgress,
  updateOrderNextAction,
  updateOrderPlanning,
  updateOrderStatus,
  updateOrderWebsite,
} from "@/lib/order-ops";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminOrders}`);
  return session;
}

function refreshOrder(id?: string) {
  revalidatePath(workspaceRoutes.adminOrders);
  revalidatePath(workspaceRoutes.admin);
  if (id) revalidatePath(`${workspaceRoutes.adminOrders}/${id}`);
}

export async function createOrderAction(_previous: { message?: string } | null, formData: FormData) {
  const session = await guard();
  const result = await createOrderFromAgreement({
    organizationId: String(formData.get("organizationId") ?? "") || undefined,
    leadId: String(formData.get("leadId") ?? "") || undefined,
    customerName: String(formData.get("customerName") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    website: String(formData.get("website") ?? ""),
    productType: String(formData.get("productType") ?? "website"),
    priceAmount: String(formData.get("priceAmount") ?? ""),
    includeRecurringBeheer: formData.get("includeRecurringBeheer") === "on",
    scope: String(formData.get("scope") ?? ""),
    targetLiveAt: String(formData.get("targetLiveAt") ?? ""),
    actorEmail: session.email,
  });
  if (result.ok) {
    refreshOrder(result.orderId);
    redirect(`${workspaceRoutes.adminOrders}/${result.orderId}`);
  }
  return { message: result.message };
}

export async function saveOrderStatus(formData: FormData) {
  const session = await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrderStatus({
    orderId: id,
    status: String(formData.get("status") ?? ""),
    override: formData.get("override") === "on",
    actorEmail: session.email,
  });
  refreshOrder(id);
}

export async function saveNextAction(formData: FormData) {
  const session = await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrderNextAction({
    orderId: id,
    text: String(formData.get("nextAction") ?? ""),
    at: String(formData.get("nextActionAt") ?? ""),
    owner: String(formData.get("nextActionOwner") ?? ""),
    actorEmail: session.email,
  });
  refreshOrder(id);
}

export async function savePlanning(formData: FormData) {
  const session = await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrderPlanning({
    orderId: id,
    targetLiveAt: String(formData.get("targetLiveAt") ?? ""),
    productionNotes: String(formData.get("productionNotes") ?? ""),
    reviewNotes: String(formData.get("reviewNotes") ?? ""),
    actorEmail: session.email,
  });
  refreshOrder(id);
}

export async function saveOnboarding(formData: FormData) {
  const session = await guard();
  const id = String(formData.get("id") ?? "");
  await updateOnboardingProgress({
    orderId: id,
    doneIds: formData.getAll("done").map((item) => String(item)),
    actorEmail: session.email,
  });
  refreshOrder(id);
}

export async function saveWebsite(formData: FormData) {
  const session = await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrderWebsite({
    orderId: id,
    domain: String(formData.get("domain") ?? ""),
    actorEmail: session.email,
  });
  refreshOrder(id);
}
