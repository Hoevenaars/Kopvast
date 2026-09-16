import {
  billingDraftsForProjects,
  canCancel,
  canMarkInvoiced,
  canMarkPaid,
  displayInvoiceStatus,
  fieldsForInvoiced,
  isStoredInvoiceStatus,
  parseInvoiceInput,
  parseRecurringInput,
  recurringSummary,
  sortInvoices,
  toAmount,
  type InvoiceRow,
  type RecurringRow,
  type StoredInvoiceStatus,
} from "@/lib/invoices";
import { refreshClient } from "@/lib/refresh";
import { mutateStore, newId, nowIso, readStore } from "@/lib/workspace-store";

export type InvoiceView = InvoiceRow & {
  customer: string;
  order_title: string | null;
  display_status: ReturnType<typeof displayInvoiceStatus>;
};

export type RecurringView = RecurringRow & {
  customer: string;
  order_title: string | null;
};

function asInvoice(row: InvoiceRow): InvoiceRow {
  return {
    ...row,
    amount_ex_vat: toAmount(row.amount_ex_vat),
    status: isStoredInvoiceStatus(row.status) ? row.status : "NOT_INVOICED",
    project_id: row.project_id || null,
    invoice_number: row.invoice_number || null,
    invoice_date: row.invoice_date || null,
    due_date: row.due_date || null,
    external_reference: row.external_reference || null,
    paid_at: row.paid_at || null,
  };
}

function asRecurring(row: RecurringRow): RecurringRow {
  return {
    ...row,
    monthly_amount: toAmount(row.monthly_amount),
    project_id: row.project_id || null,
    billing_notes: row.billing_notes || null,
    active: row.active !== false,
  };
}

async function loadNames() {
  const supabase = refreshClient();
  if (supabase) {
    const [orgs, projects] = await Promise.all([
      supabase.from("kopvast_organizations").select("id, name").order("name"),
      supabase.from("kopvast_projects").select("id, organization_id, title, type").order("created_at"),
    ]);
    return {
      organizations: (orgs.data ?? []) as Array<{ id: string; name: string }>,
      projects: (projects.data ?? []) as Array<{ id: string; organization_id: string; title: string; type: string }>,
    };
  }
  const store = await readStore();
  return {
    organizations: store.organizations.map((item) => ({ id: item.id, name: item.name })),
    projects: store.projects.map((item) => ({
      id: item.id,
      organization_id: item.organization_id,
      title: item.title,
      type: item.type,
    })),
  };
}

function decorateInvoices(
  invoices: InvoiceRow[],
  organizations: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; title: string }>
): InvoiceView[] {
  const orgName = new Map(organizations.map((item) => [item.id, item.name]));
  const projectName = new Map(projects.map((item) => [item.id, item.title]));
  return sortInvoices(invoices.map(asInvoice)).map((invoice) => ({
    ...invoice,
    customer: orgName.get(invoice.organization_id) ?? "Onbekende klant",
    order_title: invoice.project_id ? projectName.get(invoice.project_id) ?? null : null,
    display_status: displayInvoiceStatus(invoice),
  }));
}

function decorateRecurring(
  rows: RecurringRow[],
  organizations: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; title: string }>
): RecurringView[] {
  const orgName = new Map(organizations.map((item) => [item.id, item.name]));
  const projectName = new Map(projects.map((item) => [item.id, item.title]));
  return rows
    .map(asRecurring)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.start_date.localeCompare(b.start_date))
    .map((item) => ({
      ...item,
      customer: orgName.get(item.organization_id) ?? "Onbekende klant",
      order_title: item.project_id ? projectName.get(item.project_id) ?? null : null,
    }));
}

export async function loadInvoices() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_invoices").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as InvoiceRow[]).map(asInvoice);
  }
  return (await readStore()).invoices.map(asInvoice);
}

export async function loadRecurring() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_recurring").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as RecurringRow[]).map(asRecurring);
  }
  return (await readStore()).recurring.map(asRecurring);
}

export async function loadBillingOverview() {
  const [invoices, recurring, names] = await Promise.all([loadInvoices(), loadRecurring(), loadNames()]);
  const invoiceViews = decorateInvoices(invoices, names.organizations, names.projects);
  const recurringViews = decorateRecurring(recurring, names.organizations, names.projects);
  const counts = {
    notInvoiced: invoiceViews.filter((item) => item.display_status === "NOT_INVOICED").length,
    invoiced: invoiceViews.filter((item) => item.display_status === "INVOICED").length,
    overdue: invoiceViews.filter((item) => item.display_status === "OVERDUE").length,
    paid: invoiceViews.filter((item) => item.display_status === "PAID").length,
  };
  return {
    invoices: invoiceViews,
    recurring: recurringViews,
    organizations: names.organizations,
    projects: names.projects,
    counts,
    recurringTotals: recurringSummary(recurring),
  };
}

export async function loadInvoiceDetail(id: string) {
  if (!id) return null;
  const [invoices, names] = await Promise.all([loadInvoices(), loadNames()]);
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;
  const view = decorateInvoices([invoice], names.organizations, names.projects)[0];
  if (!view) return null;
  return {
    invoice: view,
    organizations: names.organizations,
    projects: names.projects.filter((item) => item.organization_id === invoice.organization_id),
  };
}

export async function loadOrganizationBilling(organizationId: string) {
  const [invoices, recurring, names] = await Promise.all([loadInvoices(), loadRecurring(), loadNames()]);
  return {
    invoices: decorateInvoices(
      invoices.filter((item) => item.organization_id === organizationId),
      names.organizations,
      names.projects
    ),
    recurring: decorateRecurring(
      recurring.filter((item) => item.organization_id === organizationId),
      names.organizations,
      names.projects
    ),
    projects: names.projects.filter((item) => item.organization_id === organizationId),
  };
}

export async function seedBillingForProjects(
  projects: Array<{ id: string; organization_id: string; type: string; title: string }>
) {
  if (!projects.length) return;
  const drafts = billingDraftsForProjects(projects);
  const supabase = refreshClient();
  if (supabase) {
    if (drafts.invoices.length) await supabase.from("kopvast_invoices").insert(drafts.invoices);
    if (drafts.recurring.length) await supabase.from("kopvast_recurring").insert(drafts.recurring);
    return;
  }
  await mutateStore((store) => {
    const created = nowIso();
    for (const invoice of drafts.invoices) {
      store.invoices.unshift({ ...invoice, id: newId(), created_at: created, updated_at: created });
    }
    for (const item of drafts.recurring) {
      store.recurring.unshift({ ...item, id: newId(), created_at: created, updated_at: created });
    }
  });
}

export async function createInvoice(input: {
  organizationId?: string;
  projectId?: string;
  description?: string;
  amount?: string;
}) {
  const parsed = parseInvoiceInput(input);
  if (!parsed.ok) return parsed;
  const row = {
    organization_id: parsed.organizationId,
    project_id: parsed.projectId,
    description: parsed.description,
    amount_ex_vat: parsed.amount,
    status: "NOT_INVOICED" as const,
    invoice_number: null,
    invoice_date: null,
    due_date: null,
    external_reference: null,
    paid_at: null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_invoices").insert(row).select("id").single();
    if (error || !data) return { ok: false as const, message: error?.message ?? "Factuur opslaan mislukt." };
    return { ok: true as const, id: data.id as string };
  }
  return mutateStore((store) => {
    const created = { ...row, id: newId(), created_at: nowIso(), updated_at: nowIso() };
    store.invoices.unshift(created);
    return { ok: true as const, id: created.id };
  });
}

export async function saveInvoiceDetails(
  id: string,
  input: {
    description?: string;
    amount?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    externalReference?: string;
    projectId?: string;
  }
) {
  const invoice = (await loadInvoices()).find((item) => item.id === id);
  if (!invoice) return { ok: false as const, message: "Factuur niet gevonden." };
  const description = (input.description ?? invoice.description).trim();
  if (description.length < 3) return { ok: false as const, message: "Geef een korte omschrijving." };
  let amount = invoice.amount_ex_vat;
  if (input.amount !== undefined && input.amount.trim()) {
    const parsed = parseInvoiceInput({
      organizationId: invoice.organization_id,
      description,
      amount: input.amount,
    });
    if (!parsed.ok) return parsed;
    amount = parsed.amount;
  }
  const patch = {
    description,
    amount_ex_vat: amount,
    invoice_number: (input.invoiceNumber ?? "").trim() || null,
    invoice_date: (input.invoiceDate ?? "").trim() || null,
    due_date: (input.dueDate ?? "").trim() || null,
    external_reference: (input.externalReference ?? "").trim() || null,
    project_id: (input.projectId ?? "").trim() || null,
    updated_at: nowIso(),
  };
  return patchInvoice(id, patch);
}

export async function markInvoiceInvoiced(id: string, input?: { invoiceDate?: string; dueDate?: string }) {
  const invoice = (await loadInvoices()).find((item) => item.id === id);
  if (!invoice) return { ok: false as const, message: "Factuur niet gevonden." };
  if (!canMarkInvoiced(invoice.status)) return { ok: false as const, message: "Deze factuur is al verwerkt." };
  return patchInvoice(id, { ...fieldsForInvoiced({ invoiceDate: input?.invoiceDate ?? invoice.invoice_date, dueDate: input?.dueDate ?? invoice.due_date }), updated_at: nowIso() });
}

export async function markInvoicePaid(id: string) {
  const invoice = (await loadInvoices()).find((item) => item.id === id);
  if (!invoice) return { ok: false as const, message: "Factuur niet gevonden." };
  if (!canMarkPaid(invoice.status)) return { ok: false as const, message: "Markeer eerst als gefactureerd." };
  return patchInvoice(id, { status: "PAID" satisfies StoredInvoiceStatus, paid_at: nowIso(), updated_at: nowIso() });
}

export async function cancelInvoice(id: string) {
  const invoice = (await loadInvoices()).find((item) => item.id === id);
  if (!invoice) return { ok: false as const, message: "Factuur niet gevonden." };
  if (!canCancel(invoice.status)) return { ok: false as const, message: "Deze factuur kun je niet meer annuleren." };
  return patchInvoice(id, { status: "CANCELLED" satisfies StoredInvoiceStatus, updated_at: nowIso() });
}

export async function saveRecurring(input: {
  id?: string;
  organizationId?: string;
  projectId?: string;
  monthlyAmount?: string;
  startDate?: string;
  billingNotes?: string;
  active?: string | boolean;
}) {
  const parsed = parseRecurringInput(input);
  if (!parsed.ok) return parsed;
  const row = {
    organization_id: parsed.organizationId,
    project_id: parsed.projectId,
    monthly_amount: parsed.monthlyAmount,
    start_date: parsed.startDate,
    billing_notes: parsed.billingNotes,
    active: parsed.active,
    updated_at: nowIso(),
  };
  const supabase = refreshClient();
  if (input.id) {
    if (supabase) {
      const { error } = await supabase.from("kopvast_recurring").update(row).eq("id", input.id);
      if (error) return { ok: false as const, message: error.message };
      return { ok: true as const, id: input.id };
    }
    return mutateStore((store) => {
      const current = store.recurring.find((item) => item.id === input.id);
      if (!current) return { ok: false as const, message: "Beheerregel niet gevonden." };
      Object.assign(current, row);
      return { ok: true as const, id: current.id };
    });
  }
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_recurring").insert(row).select("id").single();
    if (error || !data) return { ok: false as const, message: error?.message ?? "Beheerregel opslaan mislukt." };
    return { ok: true as const, id: data.id as string };
  }
  return mutateStore((store) => {
    const created = { ...row, id: newId(), created_at: nowIso() };
    store.recurring.unshift(created);
    return { ok: true as const, id: created.id };
  });
}

async function patchInvoice(id: string, patch: Record<string, unknown>) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_invoices").update(patch).eq("id", id);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  }
  return mutateStore((store) => {
    const invoice = store.invoices.find((item) => item.id === id);
    if (!invoice) return { ok: false as const, message: "Factuur niet gevonden." };
    Object.assign(invoice, patch);
    return { ok: true as const };
  });
}
