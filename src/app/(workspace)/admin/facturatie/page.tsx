import type { Metadata } from "next";
import Link from "next/link";
import { createInvoiceAction, saveRecurringAction } from "@/app/(workspace)/admin/facturatie/actions";
import { fieldClass, areaClass } from "@/components/form-fields";
import { SubmitButton } from "@/components/workspace/form-busy";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { loadBillingOverview } from "@/lib/billing";
import { formatDateNl, formatEuro, invoiceStatuses } from "@/lib/invoices";
import { labelFor, workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Facturatie",
  robots: { index: false, follow: false },
};

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { fout } = await searchParams;
  const data = await loadBillingOverview();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Facturatie"
        title="Facturatie"
        text="Vastleggen wat afgesproken is en of het gefactureerd of betaald is. Geen boekhoudpakket."
      />
      {fout ? <p className="text-sm text-destructive">{fout}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Nog niet gefactureerd" value={String(data.counts.notInvoiced)} />
        <Metric label="Gefactureerd" value={String(data.counts.invoiced)} />
        <Metric label="Te laat" value={String(data.counts.overdue)} />
        <Metric label="Betaald" value={String(data.counts.paid)} />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Actieve recurring omzet" value={`${formatEuro(data.recurringTotals.monthlyTotal)} / mnd`} />
        <Metric label="Beheerklanten" value={String(data.recurringTotals.customerCount)} />
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="text-sm text-ink/45">Billing notes</div>
          {data.recurringTotals.notes.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">Nog geen notities bij actief beheer.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.recurringTotals.notes.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">{data.recurring.find((row) => row.id === item.id)?.customer}: </span>
                  {item.billing_notes}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Facturen</h2>
        {data.invoices.length === 0 ? (
          <EmptyState title="Nog geen facturen" text="Zet een aanvraag om, of bereid hieronder een factuur voor." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone/50 bg-white">
            <table className="min-w-[52rem] w-full text-left text-sm">
              <thead className="border-b border-ink/8 text-xs tracking-[0.08em] text-ink/45 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Klant</th>
                  <th className="px-5 py-3 font-medium">Omschrijving</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Bedrag ex btw</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Factuurdatum</th>
                  <th className="px-5 py-3 font-medium">Vervaldatum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/6">
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#F8F6F1]">
                    <td className="px-5 py-4">
                      <Link href={`${workspaceRoutes.adminInvoices}/${invoice.id}`} className="font-semibold underline-offset-4 hover:underline">
                        {invoice.customer}
                      </Link>
                    </td>
                    <td className="px-5 py-4">{invoice.description}</td>
                    <td className="px-5 py-4 text-ink/55">{invoice.order_title ?? "—"}</td>
                    <td className="px-5 py-4 font-medium">{formatEuro(invoice.amount_ex_vat)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={labelFor(invoiceStatuses, invoice.display_status)}
                        tone={toneForStatus(invoice.display_status)}
                      />
                    </td>
                    <td className="px-5 py-4 text-ink/55">{formatDateNl(invoice.invoice_date)}</td>
                    <td className="px-5 py-4 text-ink/55">{formatDateNl(invoice.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Recurring beheer</h2>
        <p className="text-sm text-ink/45">
          Maandbedrag, startdatum en actief. V1 maakt niet automatisch elke maand een factuur.
        </p>
        {data.recurring.length === 0 ? (
          <EmptyState title="Nog geen beheerregels" text="Bij een website-aanvraag met Kopvast Beheer komt hier de recurring omzet." />
        ) : (
          <ul className="space-y-3">
            {data.recurring.map((item) => (
              <li key={item.id} className="rounded-2xl border border-stone/50 bg-white p-5">
                <form action={saveRecurringAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="organizationId" value={item.organization_id} />
                  <input type="hidden" name="projectId" value={item.project_id ?? ""} />
                  <input type="hidden" name="returnTo" value={workspaceRoutes.adminInvoices} />
                  <div className="xl:col-span-2">
                    <p className="text-sm font-semibold">{item.customer}</p>
                    <p className="mt-1 text-xs text-ink/45">{item.order_title ?? "Kopvast Beheer"}</p>
                  </div>
                  <label className="space-y-1 text-xs text-ink/45">
                    Maandbedrag
                    <input name="monthlyAmount" defaultValue={String(item.monthly_amount)} className={fieldClass} />
                  </label>
                  <label className="space-y-1 text-xs text-ink/45">
                    Startdatum
                    <input type="date" name="startDate" defaultValue={item.start_date} className={fieldClass} />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink xl:mt-6">
                    <input type="checkbox" name="active" defaultChecked={item.active} />
                    Actief
                  </label>
                  <label className="space-y-1 text-xs text-ink/45 md:col-span-2 xl:col-span-5">
                    Billing notes
                    <textarea name="billingNotes" defaultValue={item.billing_notes ?? ""} className={areaClass} />
                  </label>
                  <div className="flex items-end">
                    <SubmitButton className="text-sm underline underline-offset-4">Opslaan</SubmitButton>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Factuur voorbereiden</h2>
        {data.organizations.length === 0 ? (
          <EmptyState title="Eerst een klant" text="Zet een gewonnen aanvraag om. Daarna kun je hier een factuur klaarzetten." />
        ) : (
          <form action={createInvoiceAction} className="grid gap-3 rounded-2xl border border-stone/50 bg-white p-5 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              Klant
              <select name="organizationId" required className={fieldClass}>
                <option value="">Kies een klant</option>
                {data.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Order
              <select name="projectId" className={fieldClass}>
                <option value="">Geen order</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {data.organizations.find((org) => org.id === project.organization_id)?.name} · {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Omschrijving
              <input name="description" required placeholder="Kopvast Website" className={fieldClass} />
            </label>
            <label className="space-y-1 text-sm">
              Bedrag ex btw
              <input name="amount" required placeholder="1495" className={fieldClass} />
            </label>
            <SubmitButton className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory">
              Klaarzetten
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="text-sm text-ink/45">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
