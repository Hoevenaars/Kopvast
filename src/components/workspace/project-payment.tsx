import { formatEuro, invoiceStatuses, paymentStatusForProject, type InvoiceRow, type RecurringRow } from "@/lib/invoices";
import { labelFor } from "@/lib/product";

export function ProjectPayment({
  invoices,
  recurring,
  projectId,
}: {
  invoices: InvoiceRow[];
  recurring: RecurringRow[];
  projectId: string;
}) {
  const plan = recurring.find((item) => item.project_id === projectId);
  if (plan) {
    return (
      <p className="mt-1 text-xs text-ink/45">
        Recurring: {plan.active ? "actief" : "inactief"} · {formatEuro(plan.monthly_amount)} / mnd
      </p>
    );
  }
  const status = paymentStatusForProject(invoices, projectId);
  if (!status) return <p className="mt-1 text-xs text-ink/45">Betaalstatus: nog niet voorbereid</p>;
  return <p className="mt-1 text-xs text-ink/45">Betaalstatus: {labelFor(invoiceStatuses, status)}</p>;
}
