import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAsset, saveOrganization, saveProjectStatus, saveRequestStatus } from "@/app/(workspace)/admin/klanten/actions";
import { createInvoiceAction, saveRecurringAction } from "@/app/(workspace)/admin/facturatie/actions";
import { AccessToggle } from "@/components/workspace/access-toggle";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { areaClass, fieldClass } from "@/components/form-fields";
import { SubmitButton } from "@/components/workspace/form-busy";
import { ProjectPayment } from "@/components/workspace/project-payment";
import { loadOrganizationBilling } from "@/lib/billing";
import { formatDateNl, formatEuro, invoiceStatuses, isoDate } from "@/lib/invoices";
import {
  assetKinds,
  labelFor,
  organizationStatuses,
  projectStatuses,
  requestStatuses,
  requestTypes,
  workspaceRoutes,
} from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Klant",
  robots: { index: false, follow: false },
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { id } = await params;
  const { fout } = await searchParams;
  const workspace = await loadCustomerWorkspace(id);
  if (!workspace) notFound();
  const { organization, members, projects, assets, requests } = workspace;
  const billing = await loadOrganizationBilling(organization.id);

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Klant" title={organization.name} text={organization.website || "Geen website opgegeven"} />
      {fout ? <p className="text-sm text-destructive">{fout}</p> : null}

      <form action={saveOrganization} className="mt-8 grid gap-4 rounded-2xl border border-stone/50 p-5 md:grid-cols-[16rem_1fr]">
        <input type="hidden" name="id" value={organization.id} />
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium text-ink">
            Klantstatus
          </label>
          <select id="status" name="status" defaultValue={organization.status} className={fieldClass}>
            {organizationStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium text-ink">
            Interne notitie
          </label>
          <textarea id="notes" name="notes" defaultValue={organization.notes ?? ""} className={areaClass} />
        </div>
        <button type="submit" className="text-sm underline underline-offset-4">
          Opslaan
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Gebruikers</h2>
        {members.length === 0 ? (
          <EmptyState title="Nog geen gebruikers" text="Bij het omzetten van een aanvraag komt hier het klantaccount." />
        ) : (
          <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="mt-1 text-sm text-ink/45">{member.email}</p>
                </div>
                <AccessToggle memberId={member.id} organizationId={organization.id} enabled={member.access_enabled} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mt-12 text-xl text-ink">Projecten</h2>
      <ul className="mt-4 space-y-3">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-col gap-3 rounded-2xl border border-stone/50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{project.title}</p>
              <p className="text-sm text-olive">{project.price_label}</p>
              <ProjectPayment invoices={billing.invoices} recurring={billing.recurring} projectId={project.id} />
            </div>
            <form action={saveProjectStatus} className="flex items-center gap-3">
              <input type="hidden" name="id" value={project.id} />
              <input type="hidden" name="organizationId" value={organization.id} />
              <select name="status" defaultValue={project.status} className={fieldClass}>
                {projectStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="text-sm underline underline-offset-4">
                Update
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-xl text-ink">Bestanden</h2>
      {assets.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nog geen bestanden" text="Zet hieronder een logo of huisstijllink klaar." />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-stone/40 rounded-2xl border border-stone/50">
          {assets.map((asset) => (
            <li key={asset.id} className="px-5 py-4 text-sm">
              <p className="font-medium text-ink">{asset.name}</p>
              <p className="text-olive">{labelFor(assetKinds, asset.kind)}</p>
              {asset.url ? (
                <a href={asset.url} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  {asset.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form action={saveAsset} className="mt-4 grid gap-3 rounded-2xl border border-stone/50 p-5 md:grid-cols-2">
        <input type="hidden" name="organizationId" value={organization.id} />
        <input name="name" required placeholder="Naam" className={fieldClass} />
        <select name="kind" className={fieldClass}>
          {assetKinds.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input name="url" placeholder="https://" className={fieldClass} />
        <input name="note" placeholder="Toelichting" className={fieldClass} />
        <button type="submit" className="text-sm underline underline-offset-4">
          Bestand toevoegen
        </button>
      </form>

      <h2 className="mt-12 text-xl text-ink">Verzoeken</h2>
      {requests.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Geen verzoeken" text="Klanten sturen wijzigingen vanuit Mijn Kopvast." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((item) => (
            <li key={item.id} className="rounded-2xl border border-stone/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-olive">{labelFor(requestTypes, item.type)}</p>
                  <h3 className="mt-1 text-base text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-olive">{item.body}</p>
                </div>
                <StatusBadge label={labelFor(requestStatuses, item.status)} tone={toneForStatus(item.status)} />
              </div>
              <form action={saveRequestStatus} className="mt-4 flex items-center gap-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="organizationId" value={organization.id} />
                <select name="status" defaultValue={item.status} className={fieldClass}>
                  {requestStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-sm underline underline-offset-4">
                  Update
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-xl text-ink">Facturen</h2>
      {billing.invoices.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nog geen facturen" text="Bereid hieronder een factuur voor, of zet een standaardorder om." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {billing.invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-stone/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{invoice.description}</p>
                <p className="text-sm text-olive">
                  {formatEuro(invoice.amount_ex_vat)} · {formatDateNl(invoice.invoice_date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={labelFor(invoiceStatuses, invoice.display_status)} tone={toneForStatus(invoice.display_status)} />
                <Link href={`${workspaceRoutes.adminInvoices}/${invoice.id}`} className="text-sm underline underline-offset-4">
                  Openen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={createInvoiceAction} className="mt-4 grid gap-3 rounded-2xl border border-stone/50 p-5 md:grid-cols-2">
        <input type="hidden" name="organizationId" value={organization.id} />
        <input type="hidden" name="returnTo" value={`${workspaceRoutes.adminCustomers}/${organization.id}`} />
        <input name="description" required placeholder="Omschrijving" className={fieldClass} />
        <input name="amount" required placeholder="Bedrag ex btw" className={fieldClass} />
        <select name="projectId" className={fieldClass}>
          <option value="">Geen order</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <SubmitButton className="text-sm underline underline-offset-4">Factuur klaarzetten</SubmitButton>
      </form>

      <h2 className="mt-12 text-xl text-ink">Recurring beheer</h2>
      {billing.recurring.length === 0 ? (
        <form action={saveRecurringAction} className="mt-4 grid gap-3 rounded-2xl border border-stone/50 p-5 md:grid-cols-2">
          <input type="hidden" name="organizationId" value={organization.id} />
          <input type="hidden" name="returnTo" value={`${workspaceRoutes.adminCustomers}/${organization.id}`} />
          <input name="monthlyAmount" required placeholder="Maandbedrag" defaultValue="199" className={fieldClass} />
          <input type="date" name="startDate" required defaultValue={isoDate()} className={fieldClass} />
          <select name="projectId" className={fieldClass}>
            <option value="">Geen order</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Actief
          </label>
          <textarea name="billingNotes" placeholder="Billing notes" className={`${areaClass} md:col-span-2`} />
          <SubmitButton className="text-sm underline underline-offset-4">Beheerregel toevoegen</SubmitButton>
        </form>
      ) : (
        <ul className="mt-4 space-y-3">
          {billing.recurring.map((item) => (
            <li key={item.id} className="rounded-2xl border border-stone/50 p-5">
              <form action={saveRecurringAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="organizationId" value={organization.id} />
                <input type="hidden" name="projectId" value={item.project_id ?? ""} />
                <input type="hidden" name="returnTo" value={`${workspaceRoutes.adminCustomers}/${organization.id}`} />
                <input name="monthlyAmount" defaultValue={String(item.monthly_amount)} className={fieldClass} />
                <input type="date" name="startDate" defaultValue={item.start_date} className={fieldClass} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={item.active} />
                  Actief
                </label>
                <textarea name="billingNotes" defaultValue={item.billing_notes ?? ""} placeholder="Billing notes" className={`${areaClass} md:col-span-2`} />
                <SubmitButton className="text-sm underline underline-offset-4">Opslaan</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
