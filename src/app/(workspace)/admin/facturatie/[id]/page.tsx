import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelInvoiceAction,
  markInvoicedAction,
  markPaidAction,
  saveInvoiceAction,
} from "@/app/(workspace)/admin/facturatie/actions";
import { fieldClass } from "@/components/form-fields";
import { SubmitButton } from "@/components/workspace/form-busy";
import { PageIntro } from "@/components/workspace/page-frame";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { loadInvoiceDetail } from "@/lib/billing";
import { canCancel, canMarkInvoiced, canMarkPaid, formatEuro, invoiceStatuses } from "@/lib/invoices";
import { labelFor, workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Factuur",
  robots: { index: false, follow: false },
};

export default async function AdminInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { id } = await params;
  const { fout } = await searchParams;
  const detail = await loadInvoiceDetail(id);
  if (!detail) notFound();
  const { invoice, projects } = detail;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Factuur"
        title={invoice.invoice_number || invoice.description}
        text={`${invoice.customer} · ${formatEuro(invoice.amount_ex_vat)} ex btw`}
        action={
          <Link href={workspaceRoutes.adminInvoices} className="text-sm underline underline-offset-4">
            Alle facturen
          </Link>
        }
      />
      {fout ? <p className="text-sm text-destructive">{fout}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={labelFor(invoiceStatuses, invoice.display_status)} tone={toneForStatus(invoice.display_status)} />
        <Link
          href={`${workspaceRoutes.adminCustomers}/${invoice.organization_id}`}
          className="text-sm underline underline-offset-4"
        >
          {invoice.customer}
        </Link>
        {invoice.order_title ? <p className="text-sm text-ink/45">Order: {invoice.order_title}</p> : null}
      </div>

      <form action={saveInvoiceAction} className="grid gap-4 rounded-2xl border border-stone/50 bg-white p-5 md:grid-cols-2">
        <input type="hidden" name="id" value={invoice.id} />
        <input type="hidden" name="organizationId" value={invoice.organization_id} />
        <label className="space-y-1 text-sm md:col-span-2">
          Omschrijving
          <input name="description" defaultValue={invoice.description} className={fieldClass} />
        </label>
        <label className="space-y-1 text-sm">
          Order
          <select name="projectId" defaultValue={invoice.project_id ?? ""} className={fieldClass}>
            <option value="">Geen order</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Bedrag ex btw
          <input name="amount" defaultValue={String(invoice.amount_ex_vat)} className={fieldClass} />
        </label>
        <label className="space-y-1 text-sm">
          Factuurnummer
          <input name="invoiceNumber" defaultValue={invoice.invoice_number ?? ""} placeholder="KV-2026-001" className={fieldClass} />
        </label>
        <label className="space-y-1 text-sm">
          External reference
          <input name="externalReference" defaultValue={invoice.external_reference ?? ""} placeholder="Twinfield / Mollie later" className={fieldClass} />
        </label>
        <label className="space-y-1 text-sm">
          Factuurdatum
          <input type="date" name="invoiceDate" defaultValue={invoice.invoice_date ?? ""} className={fieldClass} />
        </label>
        <label className="space-y-1 text-sm">
          Vervaldatum
          <input type="date" name="dueDate" defaultValue={invoice.due_date ?? ""} className={fieldClass} />
        </label>
        <div className="md:col-span-2">
          <SubmitButton className="text-sm underline underline-offset-4">Gegevens opslaan</SubmitButton>
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        {canMarkInvoiced(invoice.status) ? (
          <form action={markInvoicedAction}>
            <input type="hidden" name="id" value={invoice.id} />
            <input type="hidden" name="organizationId" value={invoice.organization_id} />
            <input type="hidden" name="invoiceDate" value={invoice.invoice_date ?? ""} />
            <input type="hidden" name="dueDate" value={invoice.due_date ?? ""} />
            <SubmitButton className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory">
              Markeer als gefactureerd
            </SubmitButton>
          </form>
        ) : null}
        {canMarkPaid(invoice.status) ? (
          <form action={markPaidAction}>
            <input type="hidden" name="id" value={invoice.id} />
            <input type="hidden" name="organizationId" value={invoice.organization_id} />
            <SubmitButton className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm text-ivory">
              Markeer als betaald
            </SubmitButton>
          </form>
        ) : null}
        {canCancel(invoice.status) ? (
          <form action={cancelInvoiceAction}>
            <input type="hidden" name="id" value={invoice.id} />
            <input type="hidden" name="organizationId" value={invoice.organization_id} />
            <SubmitButton className="inline-flex h-11 items-center rounded-md border border-stone px-5 text-sm text-ink">
              Annuleer
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
