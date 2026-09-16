"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptProposal,
  addCustomerInvoice,
  addCustomerNote,
  addCustomerProject,
  addCustomerSupport,
  createProposalForCustomer,
  resolveCustomerReview,
  updateInvoiceStatus,
  updateSupportStatus,
} from "@/lib/customer-dossier";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import { addAsset, updateOrganization, updateProjectStatus, updateRequestStatus } from "@/lib/workspace";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);
  return session;
}

function refreshCustomer(organizationId?: string) {
  revalidatePath(workspaceRoutes.adminCustomers);
  revalidatePath(workspaceRoutes.admin);
  revalidatePath(workspaceRoutes.adminWebsites);
  revalidatePath(workspaceRoutes.adminBeheer);
  revalidatePath(workspaceRoutes.adminSupport);
  if (organizationId) revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
}

export async function saveOrganization(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  await updateOrganization(id, {
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  refreshCustomer(id);
}

export async function saveProjectStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateProjectStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  refreshCustomer(organizationId);
}

export async function saveRequestStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateRequestStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  refreshCustomer(organizationId);
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
  refreshCustomer(organizationId);
}

export async function addNoteAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await addCustomerNote({
    organizationId,
    body: String(formData.get("body") ?? ""),
    actorEmail: session.email,
  });
  refreshCustomer(organizationId);
  redirect(`${workspaceRoutes.adminCustomers}/${organizationId}?tab=overzicht`);
}

export async function addSupportAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await addCustomerSupport({
    organizationId,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    actorEmail: session.email,
  });
  refreshCustomer(organizationId);
  redirect(`${workspaceRoutes.adminCustomers}/${organizationId}?tab=overzicht`);
}

export async function addProjectAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await addCustomerProject({
    organizationId,
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    priceLabel: String(formData.get("priceLabel") ?? ""),
    actorEmail: session.email,
  });
  refreshCustomer(organizationId);
  redirect(`${workspaceRoutes.adminCustomers}/${organizationId}?tab=opdrachten`);
}

export async function addProposalAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await createProposalForCustomer({
    organizationId,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    productType: String(formData.get("productType") ?? ""),
    amountLabel: String(formData.get("amountLabel") ?? ""),
    actorEmail: session.email,
  });
  refreshCustomer(organizationId);
  redirect(`${workspaceRoutes.adminCustomers}/${organizationId}?tab=voorstellen`);
}

export async function acceptProposalAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await acceptProposal(String(formData.get("id") ?? ""), session.email);
  if (result.ok) {
    refreshCustomer(result.organizationId);
    redirect(`${workspaceRoutes.adminCustomers}/${result.organizationId}?tab=voorstellen`);
  }
  refreshCustomer(organizationId);
  redirect(workspaceRoutes.adminCustomers);
}

export async function addInvoiceAction(formData: FormData) {
  const session = await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await addCustomerInvoice({
    organizationId,
    title: String(formData.get("title") ?? ""),
    amountLabel: String(formData.get("amountLabel") ?? ""),
    number: String(formData.get("number") ?? ""),
    actorEmail: session.email,
  });
  refreshCustomer(organizationId);
  redirect(`${workspaceRoutes.adminCustomers}/${organizationId}?tab=facturen`);
}

export async function saveSupportStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateSupportStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  refreshCustomer(organizationId);
}

export async function saveInvoiceStatus(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  await updateInvoiceStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  refreshCustomer(organizationId);
}

export async function resolveReviewAction(formData: FormData) {
  const session = await guard();
  const result = await resolveCustomerReview({
    proposalId: String(formData.get("proposalId") ?? ""),
    action: String(formData.get("action") ?? "") === "create" ? "create" : "merge",
    organizationId: String(formData.get("organizationId") ?? "") || undefined,
    actorEmail: session.email,
  });
  refreshCustomer(result.ok ? result.organizationId : undefined);
  if (result.ok) redirect(`${workspaceRoutes.adminCustomers}/${result.organizationId}`);
  redirect(workspaceRoutes.adminCustomers);
}