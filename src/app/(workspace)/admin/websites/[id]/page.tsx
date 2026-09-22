import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { saveLinkedBeheer, saveLinkedRequest, saveWebsite } from "@/app/(workspace)/admin/websites/actions";
import { areaClass, fieldClass } from "@/components/form-fields";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import {
  beheerStatuses,
  labelFor,
  projectStatuses,
  requestStatuses,
  requestTypes,
  workspaceRoutes,
} from "@/lib/product";
import { formatPrice } from "@/lib/products";
import { formatDateNl, monthlyAmountFor, recurringStatusLabel } from "@/lib/sites";
import { loadWebsiteDetail } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Website",
  robots: { index: false, follow: false },
};

export default async function AdminWebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadWebsiteDetail(id);
  if (!detail) notFound();
  const { website, project, organization, beheer, recurring, requests } = detail;
  const changes = requests.filter((item) => item.type === "post_launch" || item.type === "wijziging" || item.type === "content");
  const support = requests.filter((item) => item.type === "vraag" || item.type === "post_launch");

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Website"
        title={website.domain}
        text={`${website.customerName}${organization?.website ? ` · ${organization.website}` : ""}`}
        action={
          organization ? (
            <Link
              href={`${workspaceRoutes.adminCustomers}/${organization.id}`}
              className="text-sm underline underline-offset-4"
            >
              Naar klant
            </Link>
          ) : null
        }
      />

      <form action={saveWebsite} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="organizationId" value={project.organization_id} />
        <Field label="Primair domein" htmlFor="primaryDomain">
          <input
            id="primaryDomain"
            name="primaryDomain"
            defaultValue={project.primary_domain ?? website.domain}
            className={fieldClass}
            placeholder="jouwbedrijf.nl"
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={project.status} className={fieldClass}>
            {projectStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preview-URL" htmlFor="previewUrl">
          <input
            id="previewUrl"
            name="previewUrl"
            defaultValue={project.preview_url ?? ""}
            className={fieldClass}
            placeholder="https://"
          />
        </Field>
        <Field label="Productie-URL" htmlFor="productionUrl">
          <input
            id="productionUrl"
            name="productionUrl"
            defaultValue={project.production_url ?? ""}
            className={fieldClass}
            placeholder="https://"
          />
        </Field>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="technicalNote" className="text-sm font-medium text-ink">
            Technische info
          </label>
          <textarea
            id="technicalNote"
            name="technicalNote"
            defaultValue={project.technical_note ?? ""}
            className={areaClass}
            placeholder="Hosting, DNS, of andere technische notities als die er al zijn."
          />
        </div>
        <button type="submit" className="text-sm underline underline-offset-4">
          Opslaan
        </button>
      </form>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Doorlopende dienst</p>
        {recurring.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55">Geen hosting of beheer gekoppeld.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {recurring.map((service) => (
              <li key={service.id} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-ink/45">Product</p>
                  <p className="font-semibold">{service.title}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/45">Status</p>
                  <p>{recurringStatusLabel(service.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/45">Sinds</p>
                  <p>{formatDateNl(service.started_at || service.live_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/45">Tarief</p>
                  <p>{formatPrice(monthlyAmountFor(service))} per maand excl. btw</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href={workspaceRoutes.adminBeheer} className="mt-4 inline-block text-sm underline underline-offset-4">
          Naar beheer
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Opdracht</p>
          <h2 className="mt-3 text-lg font-semibold">{project.title}</h2>
          <p className="mt-2 text-sm text-ink/55">{project.price_label || "Geen prijs vastgelegd"}</p>
          <p className="mt-4 text-sm">
            Live sinds {formatDateNl(project.live_at)} · {labelFor(projectStatuses, project.status)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Beheer</p>
          {beheer ? (
            <form action={saveLinkedBeheer} className="mt-3 space-y-3">
              <input type="hidden" name="beheerId" value={beheer.id} />
              <input type="hidden" name="organizationId" value={project.organization_id} />
              <input type="hidden" name="websiteId" value={project.id} />
              <p className="text-lg font-semibold">{beheer.title}</p>
              <p className="text-sm text-ink/55">{beheer.price_label}</p>
              <select name="status" defaultValue={beheer.status} className={fieldClass}>
                {beheerStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
                {!beheerStatuses.some((item) => item.value === beheer.status) ? (
                  <option value={beheer.status}>{labelFor(projectStatuses, beheer.status)}</option>
                ) : null}
              </select>
              <button type="submit" className="text-sm underline underline-offset-4">
                Beheer bijwerken
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-ink/55">Geen beheerdienst gekoppeld.</p>
          )}
        </div>
      </section>

      <RequestSection
        title="Support"
        empty="Geen openstaande of eerdere support."
        items={support}
        organizationId={project.organization_id}
        websiteId={project.id}
      />
      <RequestSection
        title="Wijzigingen"
        empty="Nog geen wijzigingen na livegang."
        items={changes}
        organizationId={project.organization_id}
        websiteId={project.id}
      />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function RequestSection({
  title,
  empty,
  items,
  organizationId,
  websiteId,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    status: string;
    file_name: string | null;
  }>;
  organizationId: string;
  websiteId: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl text-ink">{title}</h2>
        <Link href={workspaceRoutes.adminSupport} className="text-sm underline underline-offset-4">
          Alle support
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title={empty} text="Nieuwe verzoeken van de klant landen hier." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-olive">{labelFor(requestTypes, item.type)}</p>
                  <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/55">{item.body}</p>
                  {item.file_name ? <p className="mt-2 text-xs text-ink/45">Bijlage: {item.file_name}</p> : null}
                </div>
                <StatusBadge label={labelFor(requestStatuses, item.status)} tone={toneForStatus(item.status)} />
              </div>
              <form action={saveLinkedRequest} className="mt-4 flex items-center gap-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="websiteId" value={websiteId} />
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
    </section>
  );
}
