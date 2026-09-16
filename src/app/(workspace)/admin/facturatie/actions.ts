"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  cancelInvoice,
  createInvoice,
  markInvoiceInvoiced,
  markInvoicePaid,
  saveInvoiceDetails,
  saveRecurring,
} from "@/lib/billing";
import { workspaceRoutes } from "@/lib/product";

async function guard() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminInvoices}`);
  return session;
}

function fail(path: string, message: string): never {
  redirect(`${path}?fout=${encodeURIComponent(message)}`);
}

function revalidateBilling(organizationId?: string, invoiceId?: string) {
  revalidatePath(workspaceRoutes.adminInvoices);
  revalidatePath(workspaceRoutes.consoleInvoices);
  if (invoiceId) revalidatePath(`${workspaceRoutes.adminInvoices}/${invoiceId}`);
  if (organizationId) {
    revalidatePath(`${workspaceRoutes.adminCustomers}/${organizationId}`);
    revalidatePath(workspaceRoutes.consoleWebsite);
  }
}

export async function createInvoiceAction(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? workspaceRoutes.adminInvoices);
  const result = await createInvoice({
    organizationId,
    projectId: String(formData.get("projectId") ?? ""),
    description: String(formData.get("description") ?? ""),
    amount: String(formData.get("amount") ?? ""),
  });
  if (!result.ok) fail(returnTo, result.message);
  revalidateBilling(organizationId, result.id);
  redirect(`${workspaceRoutes.adminInvoices}/${result.id}`);
}

export async function saveInvoiceAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await saveInvoiceDetails(id, {
    description: String(formData.get("description") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
    invoiceDate: String(formData.get("invoiceDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    externalReference: String(formData.get("externalReference") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
  });
  const path = `${workspaceRoutes.adminInvoices}/${id}`;
  if (!result.ok) fail(path, result.message);
  revalidateBilling(organizationId, id);
  redirect(path);
}

export async function markInvoicedAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await markInvoiceInvoiced(id, {
    invoiceDate: String(formData.get("invoiceDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
  });
  const path = `${workspaceRoutes.adminInvoices}/${id}`;
  if (!result.ok) fail(path, result.message);
  revalidateBilling(organizationId, id);
  redirect(path);
}

export async function markPaidAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await markInvoicePaid(id);
  const path = `${workspaceRoutes.adminInvoices}/${id}`;
  if (!result.ok) fail(path, result.message);
  revalidateBilling(organizationId, id);
  redirect(path);
}

export async function cancelInvoiceAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const result = await cancelInvoice(id);
  const path = `${workspaceRoutes.adminInvoices}/${id}`;
  if (!result.ok) fail(path, result.message);
  revalidateBilling(organizationId, id);
  redirect(path);
}

export async function saveRecurringAction(formData: FormData) {
  await guard();
  const organizationId = String(formData.get("organizationId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? workspaceRoutes.adminInvoices);
  const result = await saveRecurring({
    id: String(formData.get("id") ?? "") || undefined,
    organizationId,
    projectId: String(formData.get("projectId") ?? ""),
    monthlyAmount: String(formData.get("monthlyAmount") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    billingNotes: String(formData.get("billingNotes") ?? ""),
    active: formData.get("active") === "on",
  });
  if (!result.ok) fail(returnTo, result.message);
  revalidateBilling(organizationId);
  redirect(returnTo);
}
