import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { loadOrganizationBilling } from "@/lib/billing";
import { formatDateNl, formatEuro, invoiceStatuses } from "@/lib/invoices";
import { labelFor, workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Facturen",
  robots: { index: false, follow: false },
};

export default async function CustomerInvoicesPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const billing = await loadOrganizationBilling(session.organizationId);
  const activeRecurring = billing.recurring.filter((item) => item.active);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Facturen"
        title="Facturen"
        text="Overzicht van afgesproken bedragen en of ze gefactureerd of betaald zijn."
      />

      {activeRecurring.length > 0 ? (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Beheer</div>
          <ul className="mt-4 space-y-3">
            {activeRecurring.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.order_title ?? "Kopvast Beheer"}</p>
                  <p className="text-xs text-ink/45">Actief sinds {formatDateNl(item.start_date)}</p>
                </div>
                <p className="text-sm font-semibold">{formatEuro(item.monthly_amount)} per maand</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {billing.invoices.length === 0 ? (
        <EmptyState title="Nog geen facturen" text="Zodra Kopvast een bedrag klaarzet, zie je hier de status." />
      ) : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {billing.invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{invoice.description}</p>
                <p className="mt-1 text-xs text-ink/45">
                  {[
                    invoice.order_title,
                    invoice.invoice_number,
                    invoice.invoice_date ? formatDateNl(invoice.invoice_date) : null,
                    invoice.due_date ? `te betalen vóór ${formatDateNl(invoice.due_date)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nog geen factuurdatum"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">{formatEuro(invoice.amount_ex_vat)}</p>
                <StatusBadge
                  label={labelFor(invoiceStatuses, invoice.display_status)}
                  tone={toneForStatus(invoice.display_status)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
