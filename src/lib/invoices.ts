import type { ProjectType } from "@/lib/product";

export const DEFAULT_DUE_DAYS = 14;

export const storedInvoiceStatuses = [
  { value: "NOT_INVOICED", label: "Nog niet gefactureerd" },
  { value: "INVOICED", label: "Gefactureerd" },
  { value: "PAID", label: "Betaald" },
  { value: "CANCELLED", label: "Geannuleerd" },
] as const;

export const invoiceStatuses = [
  ...storedInvoiceStatuses.slice(0, 2),
  { value: "OVERDUE", label: "Te laat" },
  ...storedInvoiceStatuses.slice(2),
] as const;

export type StoredInvoiceStatus = (typeof storedInvoiceStatuses)[number]["value"];
export type InvoiceStatus = (typeof invoiceStatuses)[number]["value"];

export type InvoiceRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  description: string;
  amount_ex_vat: number;
  status: StoredInvoiceStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  external_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  monthly_amount: number;
  start_date: string;
  active: boolean;
  billing_notes: string | null;
  created_at: string;
  updated_at: string;
};

export const projectInvoiceAmounts: Partial<Record<ProjectType, number>> = {
  website: 1495,
  merkrefresh: 995,
  sjablonen: 495,
};

export const projectRecurringAmounts: Partial<Record<ProjectType, number>> = {
  beheer: 199,
};

export function isStoredInvoiceStatus(value: string): value is StoredInvoiceStatus {
  return storedInvoiceStatuses.some((item) => item.value === value);
}

export function isoDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseAmountInput(value: string) {
  const trimmed = value.trim().replace(/\s/g, "").replace("€", "");
  if (!trimmed) return null;
  if (trimmed.includes(",")) {
    const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? roundAmount(parsed) : null;
  }
  if (/^\d+\.\d{1,2}$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? roundAmount(parsed) : null;
  }
  const parsed = Number(trimmed.replace(/\./g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDateNl(value: string | null | undefined) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("nl-NL");
}

export function displayInvoiceStatus(
  invoice: Pick<InvoiceRow, "status" | "due_date">,
  today = isoDate()
): InvoiceStatus {
  if (invoice.status === "INVOICED" && invoice.due_date && invoice.due_date < today) return "OVERDUE";
  return invoice.status;
}

export function invoiceAmountForType(type: string) {
  return projectInvoiceAmounts[type as ProjectType] ?? null;
}

export function recurringAmountForType(type: string) {
  return projectRecurringAmounts[type as ProjectType] ?? null;
}

export function billingDraftsForProjects(
  projects: Array<{ id: string; organization_id: string; type: string; title: string }>,
  today = isoDate()
) {
  const invoices: Array<
    Pick<
      InvoiceRow,
      | "organization_id"
      | "project_id"
      | "description"
      | "amount_ex_vat"
      | "status"
      | "invoice_number"
      | "invoice_date"
      | "due_date"
      | "external_reference"
      | "paid_at"
    >
  > = [];
  const recurring: Array<
    Pick<RecurringRow, "organization_id" | "project_id" | "monthly_amount" | "start_date" | "active" | "billing_notes">
  > = [];

  for (const project of projects) {
    const amount = invoiceAmountForType(project.type);
    if (amount != null) {
      invoices.push({
        organization_id: project.organization_id,
        project_id: project.id,
        description: project.title,
        amount_ex_vat: amount,
        status: "NOT_INVOICED",
        invoice_number: null,
        invoice_date: null,
        due_date: null,
        external_reference: null,
        paid_at: null,
      });
    }
    const monthly = recurringAmountForType(project.type);
    if (monthly != null) {
      recurring.push({
        organization_id: project.organization_id,
        project_id: project.id,
        monthly_amount: monthly,
        start_date: today,
        active: true,
        billing_notes: null,
      });
    }
  }

  return { invoices, recurring };
}

export function parseInvoiceInput(input: {
  organizationId?: string;
  projectId?: string;
  description?: string;
  amount?: string;
}) {
  const organizationId = (input.organizationId ?? "").trim();
  const description = (input.description ?? "").trim();
  const projectId = (input.projectId ?? "").trim() || null;
  const amount = parseAmountInput(input.amount ?? "");
  if (!organizationId) return { ok: false as const, message: "Kies een klant." };
  if (description.length < 3) return { ok: false as const, message: "Geef een korte omschrijving." };
  if (amount == null) return { ok: false as const, message: "Vul een bedrag ex btw in." };
  return { ok: true as const, organizationId, projectId, description, amount };
}

export function parseRecurringInput(input: {
  organizationId?: string;
  projectId?: string;
  monthlyAmount?: string;
  startDate?: string;
  billingNotes?: string;
  active?: string | boolean;
}) {
  const organizationId = (input.organizationId ?? "").trim();
  const projectId = (input.projectId ?? "").trim() || null;
  const monthlyAmount = parseAmountInput(input.monthlyAmount ?? "");
  const startDate = (input.startDate ?? "").trim();
  const billingNotes = (input.billingNotes ?? "").trim() || null;
  const active = input.active === true || input.active === "on" || input.active === "true";
  if (!organizationId) return { ok: false as const, message: "Kies een klant." };
  if (monthlyAmount == null) return { ok: false as const, message: "Vul een maandbedrag in." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false as const, message: "Kies een startdatum." };
  return { ok: true as const, organizationId, projectId, monthlyAmount, startDate, billingNotes, active };
}

export function fieldsForInvoiced(
  input: { invoiceDate?: string | null; dueDate?: string | null },
  today = isoDate()
) {
  const invoiceDate = (input.invoiceDate || "").trim() || today;
  const dueDate = (input.dueDate || "").trim() || addDays(invoiceDate, DEFAULT_DUE_DAYS);
  return {
    status: "INVOICED" as const,
    invoice_date: invoiceDate,
    due_date: dueDate,
  };
}

export function canMarkInvoiced(status: StoredInvoiceStatus) {
  return status === "NOT_INVOICED";
}

export function canMarkPaid(status: StoredInvoiceStatus) {
  return status === "INVOICED";
}

export function canCancel(status: StoredInvoiceStatus) {
  return status === "NOT_INVOICED" || status === "INVOICED";
}

export function statusRank(status: InvoiceStatus) {
  const order: Record<InvoiceStatus, number> = {
    OVERDUE: 0,
    NOT_INVOICED: 1,
    INVOICED: 2,
    PAID: 3,
    CANCELLED: 4,
  };
  return order[status];
}

export function sortInvoices<T extends Pick<InvoiceRow, "status" | "due_date" | "created_at">>(
  invoices: T[],
  today = isoDate()
) {
  return [...invoices].sort((a, b) => {
    const statusDiff = statusRank(displayInvoiceStatus(a, today)) - statusRank(displayInvoiceStatus(b, today));
    if (statusDiff !== 0) return statusDiff;
    return (a.due_date || a.created_at).localeCompare(b.due_date || b.created_at);
  });
}

export function paymentStatusForProject(
  invoices: InvoiceRow[],
  projectId: string,
  today = isoDate()
): InvoiceStatus | null {
  const related = sortInvoices(
    invoices.filter((item) => item.project_id === projectId && item.status !== "CANCELLED"),
    today
  );
  const current = related[0];
  return current ? displayInvoiceStatus(current, today) : null;
}

export function recurringSummary(rows: RecurringRow[]) {
  const active = rows.filter((item) => item.active);
  const organizations = new Set(active.map((item) => item.organization_id));
  return {
    monthlyTotal: roundAmount(active.reduce((sum, item) => sum + Number(item.monthly_amount), 0)),
    customerCount: organizations.size,
    notes: active.filter((item) => item.billing_notes?.trim()),
  };
}

export function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? roundAmount(amount) : 0;
}
