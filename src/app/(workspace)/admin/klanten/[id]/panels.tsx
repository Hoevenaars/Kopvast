import type { ReactNode } from "react";
import Link from "next/link";
import {
  acceptProposalAction,
  addInvoiceAction,
  addNoteAction,
  addProjectAction,
  addProposalAction,
  addSupportAction,
  saveAsset,
  saveInvoiceStatus,
  saveOrganization,
  saveProjectStatus,
  saveRequestStatus,
  saveSupportStatus,
} from "@/app/(workspace)/admin/klanten/actions";
import { AccessToggle } from "@/components/workspace/access-toggle";
import { EmptyState } from "@/components/workspace/shell";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { areaClass, fieldClass } from "@/components/form-fields";
import { formatNlDate } from "@/lib/acquisition-constants";
import {
  activitySources,
  brandAssets,
  invoiceStatuses,
  proposalStatuses,
  supportStatuses,
} from "@/lib/customers";
import type { CustomerDossier } from "@/lib/customer-dossier";
import {
  assetKinds,
  labelFor,
  organizationStatuses,
  projectStatuses,
  projectTypes,
  requestStatuses,
  requestTypes,
  workspaceRoutes,
} from "@/lib/product";
import { cn } from "@/lib/utils";

export function OverviewPanel({ dossier }: { dossier: CustomerDossier }) {
  const { organization, facts } = dossier;
  const websiteProject = dossier.projects.find((item) => item.type === "website") ?? dossier.projects[0] ?? null;
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Actieve klant" value={labelFor(organizationStatuses, organization.status)} />
        <Stat label="Website" value={organization.website || "—"} />
        <Stat label="Open opdracht" value={facts.activeOrder || "—"} />
        <Stat label="Volgende actie" value={facts.nextAction || "Geen open actie"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <QuickForm
          title="Nieuwe opdracht"
          action={addProjectAction}
          organizationId={organization.id}
          pending="Opdracht vastleggen…"
        >
          <input name="title" required placeholder="Opdrachtnaam" className={fieldClass} />
          <select name="type" className={fieldClass} defaultValue="website">
            {projectTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <SubmitButton className="text-sm font-semibold underline underline-offset-4">Opdracht starten</SubmitButton>
        </QuickForm>
        <QuickForm
          title="Voorstel maken"
          action={addProposalAction}
          organizationId={organization.id}
          pending="Voorstel maken…"
        >
          <input name="title" required placeholder="Titel van het voorstel" className={fieldClass} />
          <input name="amountLabel" placeholder="Bedrag, bijv. €1.495" className={fieldClass} />
          <SubmitButton className="text-sm font-semibold underline underline-offset-4">Voorstel opslaan</SubmitButton>
        </QuickForm>
        <QuickForm
          title="Notitie toevoegen"
          action={addNoteAction}
          organizationId={organization.id}
          pending="Notitie opslaan…"
        >
          <textarea name="body" required placeholder="Interne notitie" className={areaClass} />
          <SubmitButton className="text-sm font-semibold underline underline-offset-4">Notitie bewaren</SubmitButton>
        </QuickForm>
        <QuickForm
          title="Support registreren"
          action={addSupportAction}
          organizationId={organization.id}
          pending="Support vastleggen…"
        >
          <input name="title" required placeholder="Onderwerp" className={fieldClass} />
          <textarea name="body" required placeholder="Wat speelt er?" className={areaClass} />
          <SubmitButton className="text-sm font-semibold underline underline-offset-4">Support vastleggen</SubmitButton>
        </QuickForm>
      </section>

      {websiteProject ? (
        <p className="text-sm text-ink/50">
          Huidige website-opdracht: {websiteProject.title} · {labelFor(projectStatuses, websiteProject.status)}
        </p>
      ) : null}
    </div>
  );
}

export function ContactPanel({ dossier }: { dossier: CustomerDossier }) {
  const { organization, members } = dossier;
  return (
    <div className="space-y-8">
      <form action={saveOrganization} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-[16rem_1fr]">
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
        <h2 className="text-xl text-ink">Contactpersonen</h2>
        {members.length === 0 ? (
          <EmptyState title="Nog geen contact" text="Bij het koppelen van een voorstel of aanvraag komt hier het klantaccount." />
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
    </div>
  );
}

export function LeadsPanel({ dossier }: { dossier: CustomerDossier }) {
  if (dossier.leads.length === 0) {
    return <EmptyState title="Geen aanvragen" text="Gekoppelde website- of maatwerkaanvragen verschijnen hier." />;
  }
  return (
    <ul className="space-y-3">
      {dossier.leads.map((lead) => (
        <li key={lead.id} className="rounded-2xl border border-ink/10 bg-white p-5">
          <Link href={`${workspaceRoutes.adminLeads}/${lead.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">
            {lead.company_name || lead.name}
          </Link>
          <p className="mt-1 text-sm text-ink/45">
            {lead.name} · {lead.email} · {lead.status}
          </p>
          <p className="mt-2 text-xs text-ink/40">{formatNlDate(lead.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ProposalsPanel({ dossier }: { dossier: CustomerDossier }) {
  return (
    <div className="space-y-6">
      <form action={addProposalAction} className="relative grid gap-3 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <FormBusyOverlay label="Voorstel opslaan…" />
        <input type="hidden" name="organizationId" value={dossier.organization.id} />
        <h2 className="text-lg font-semibold md:col-span-2">Voorstel maken</h2>
        <input name="title" required placeholder="Titel" className={fieldClass} />
        <select name="productType" className={fieldClass} defaultValue="website">
          {projectTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input name="amountLabel" placeholder="Bedrag" className={fieldClass} />
        <textarea name="body" placeholder="Scope en afspraken" className={cn(areaClass, "md:col-span-2")} />
        <SubmitButton className="text-sm font-semibold underline underline-offset-4">Opslaan</SubmitButton>
      </form>
      {dossier.proposals.length === 0 ? (
        <EmptyState title="Nog geen voorstellen" text="Maak een voorstel vanuit het dossier. Na akkoord blijft het gekoppeld." />
      ) : (
        <ul className="space-y-3">
          {dossier.proposals.map((proposal) => (
            <li key={proposal.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{proposal.title}</h3>
                  <p className="mt-1 text-sm text-ink/45">
                    {labelFor(proposalStatuses, proposal.status)}
                    {proposal.amount_label ? ` · ${proposal.amount_label}` : ""}
                  </p>
                </div>
                {proposal.status === "concept" || proposal.status === "verstuurd" ? (
                  <form action={acceptProposalAction} className="relative">
                    <FormBusyOverlay label="Voorstel accepteren…" />
                    <input type="hidden" name="id" value={proposal.id} />
                    <input type="hidden" name="organizationId" value={dossier.organization.id} />
                    <SubmitButton className="text-sm font-semibold underline underline-offset-4">Markeer als akkoord</SubmitButton>
                  </form>
                ) : null}
              </div>
              {proposal.body ? <p className="mt-3 text-sm leading-6 text-ink/60">{proposal.body}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrdersPanel({ dossier }: { dossier: CustomerDossier }) {
  return (
    <div className="space-y-6">
      <form action={addProjectAction} className="relative grid gap-3 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <FormBusyOverlay label="Opdracht vastleggen…" />
        <input type="hidden" name="organizationId" value={dossier.organization.id} />
        <h2 className="text-lg font-semibold md:col-span-2">Nieuwe opdracht</h2>
        <input name="title" required placeholder="Opdrachtnaam" className={fieldClass} />
        <select name="type" className={fieldClass} defaultValue="website">
          {projectTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input name="priceLabel" placeholder="Prijs" className={fieldClass} />
        <SubmitButton className="text-sm font-semibold underline underline-offset-4">Opdracht starten</SubmitButton>
      </form>
      {dossier.projects.length === 0 ? (
        <EmptyState title="Nog geen opdrachten" text="Start een opdracht vanuit het overzicht." />
      ) : (
        <ul className="space-y-3">
          {dossier.projects.map((project) => (
            <li key={project.id} className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40">{labelFor(projectTypes, project.type)}</p>
                <p className="mt-1 text-sm font-medium text-ink">{project.title}</p>
                <p className="text-sm text-olive">{project.price_label}</p>
              </div>
              <form action={saveProjectStatus} className="flex items-center gap-3">
                <input type="hidden" name="id" value={project.id} />
                <input type="hidden" name="organizationId" value={dossier.organization.id} />
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
      )}
    </div>
  );
}

export function WebsitePanel({ dossier }: { dossier: CustomerDossier }) {
  const website = dossier.projects.filter((item) => item.type === "website" || item.type === "beheer");
  if (website.length === 0) {
    return <EmptyState title="Nog geen website" text="Koppel een website- of beheeropdracht om de status hier te zien." />;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {website.map((project) => (
        <li key={project.id} className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/40">{labelFor(projectTypes, project.type)}</p>
          <h3 className="mt-2 text-lg font-semibold">{project.title}</h3>
          <p className="mt-2 text-sm text-ink/50">{labelFor(projectStatuses, project.status)}</p>
          {dossier.organization.website ? (
            <a href={dossier.organization.website} className="mt-3 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
              {dossier.organization.website}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function BrandPanel({ dossier }: { dossier: CustomerDossier }) {
  const assets = brandAssets(dossier.assets);
  if (!dossier.brand && assets.length === 0) {
    return (
      <EmptyState
        title="Nog geen merkprofiel"
        text="V1 toont een bestaand brand profile als dat er is. Een volledige merkeditor volgt later."
      />
    );
  }
  return (
    <div className="space-y-6">
      {dossier.brand ? (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">{dossier.brand.name || dossier.organization.name}</h2>
          {dossier.brand.tagline ? <p className="mt-2 text-sm text-ink/55">{dossier.brand.tagline}</p> : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Meta label="Primaire kleur" value={dossier.brand.primary_color || "—"} />
            <Meta label="Secundaire kleur" value={dossier.brand.secondary_color || "—"} />
            <Meta label="Typografie" value={dossier.brand.typography || "—"} />
            <Meta label="Toon" value={dossier.brand.tone || "—"} />
          </dl>
          {dossier.brand.notes ? <p className="mt-4 text-sm leading-6 text-ink/60">{dossier.brand.notes}</p> : null}
        </section>
      ) : null}
      {assets.length > 0 ? (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {assets.map((asset) => (
            <li key={`${asset.name}-${asset.url}`} className="px-5 py-4 text-sm">
              <p className="font-medium">{asset.name}</p>
              {asset.url ? (
                <a href={asset.url} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  {asset.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FilesPanel({ dossier }: { dossier: CustomerDossier }) {
  return (
    <div className="space-y-6">
      {dossier.assets.length === 0 ? (
        <EmptyState title="Nog geen bestanden" text="Zet hieronder een logo of huisstijllink klaar." />
      ) : (
        <ul className="divide-y divide-stone/40 rounded-2xl border border-stone/50">
          {dossier.assets.map((asset) => (
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
      <form action={saveAsset} className="grid gap-3 rounded-2xl border border-stone/50 p-5 md:grid-cols-2">
        <input type="hidden" name="organizationId" value={dossier.organization.id} />
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
    </div>
  );
}

export function InvoicesPanel({ dossier }: { dossier: CustomerDossier }) {
  return (
    <div className="space-y-6">
      <form action={addInvoiceAction} className="relative grid gap-3 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <FormBusyOverlay label="Factuur vastleggen…" />
        <input type="hidden" name="organizationId" value={dossier.organization.id} />
        <h2 className="text-lg font-semibold md:col-span-2">Factuur registreren</h2>
        <input name="title" required placeholder="Omschrijving" className={fieldClass} />
        <input name="number" placeholder="Nummer" className={fieldClass} />
        <input name="amountLabel" placeholder="Bedrag" className={fieldClass} />
        <SubmitButton className="text-sm font-semibold underline underline-offset-4">Opslaan</SubmitButton>
      </form>
      {dossier.invoices.length === 0 ? (
        <EmptyState title="Nog geen facturen" text="Registreer een factuur in het dossier. Betaalkoppeling volgt later." />
      ) : (
        <ul className="space-y-3">
          {dossier.invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">{invoice.title}</p>
                <p className="text-sm text-ink/45">
                  {[invoice.number, invoice.amount_label].filter(Boolean).join(" · ") || "Geen bedrag"}
                </p>
              </div>
              <form action={saveInvoiceStatus} className="flex items-center gap-3">
                <input type="hidden" name="id" value={invoice.id} />
                <input type="hidden" name="organizationId" value={dossier.organization.id} />
                <select name="status" defaultValue={invoice.status} className={fieldClass}>
                  {invoiceStatuses.map((item) => (
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
      )}
    </div>
  );
}

export function RequestsPanel({ dossier }: { dossier: CustomerDossier }) {
  if (dossier.requests.length === 0) {
    return <EmptyState title="Geen wijzigingen" text="Klanten sturen wijzigingen vanuit Mijn Kopvast." />;
  }
  return (
    <ul className="space-y-3">
      {dossier.requests.map((item) => (
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
            <input type="hidden" name="organizationId" value={dossier.organization.id} />
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
  );
}

export function ActivityPanel({ dossier }: { dossier: CustomerDossier }) {
  const supportOpen = dossier.support;
  return (
    <div className="space-y-8">
      {supportOpen.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Support</h2>
          <ul className="space-y-3">
            {supportOpen.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{ticket.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/55">{ticket.body}</p>
                  </div>
                  <form action={saveSupportStatus} className="flex items-center gap-3">
                    <input type="hidden" name="id" value={ticket.id} />
                    <input type="hidden" name="organizationId" value={dossier.organization.id} />
                    <select name="status" defaultValue={ticket.status} className={fieldClass}>
                      {supportStatuses.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-sm underline underline-offset-4">
                      Update
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {dossier.activity.length === 0 ? (
        <EmptyState title="Nog geen activiteit" text="Aanvragen, voorstellen, opdrachten en support landen hier in één tijdlijn." />
      ) : (
        <ol className="space-y-3">
          {dossier.activity.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink/10 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-ink/40">{labelFor(activitySources, item.source)}</p>
                <p className="text-xs text-ink/40">{formatNlDate(item.created_at)}</p>
              </div>
              <p className="mt-1 text-sm font-medium">{item.title}</p>
              {item.detail ? <p className="mt-1 text-sm text-ink/50">{item.detail}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function QuickForm({
  title,
  action,
  organizationId,
  pending,
  children,
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  pending: string;
  children: ReactNode;
}) {
  return (
    <form action={action} className="relative space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
      <FormBusyOverlay label={pending} />
      <h2 className="font-semibold">{title}</h2>
      <input type="hidden" name="organizationId" value={organizationId} />
      {children}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <p className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}