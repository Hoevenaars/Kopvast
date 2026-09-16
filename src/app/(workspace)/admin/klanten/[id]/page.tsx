import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAsset, saveOrganization, saveProjectStatus, saveRequestStatus } from "@/app/(workspace)/admin/klanten/actions";
import { AccessToggle } from "@/components/workspace/access-toggle";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { areaClass, fieldClass } from "@/components/form-fields";
import { onboardingProgress } from "@/lib/onboarding";
import { loadOnboardingsForOrganization } from "@/lib/onboarding-store";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await loadCustomerWorkspace(id);
  if (!workspace) notFound();
  const { organization, members, projects, assets, requests } = workspace;
  const onboardings = await loadOnboardingsForOrganization(organization.id);

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Klant" title={organization.name} text={organization.website || "Geen website opgegeven"} />

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

      <h2 className="mt-12 text-xl text-ink">Onboarding</h2>
      {onboardings.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Geen onboarding" text="Website- en maatwerkopdrachten krijgen een checklist na het omzetten van een aanvraag." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {onboardings.map((item) => {
            const progress = onboardingProgress(item.onboarding, item.items);
            return (
              <li key={item.onboarding.id}>
                <Link
                  href={`${workspaceRoutes.adminOrders}/${item.project.id}/onboarding`}
                  className="flex flex-col gap-1 rounded-2xl border border-stone/50 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{item.project.title}</p>
                    <p className="text-sm text-olive">{progress.summary}</p>
                  </div>
                  <StatusBadge label={progress.ready ? "Klaar" : "Open"} tone={progress.ready ? "ink" : "copper"} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

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
    </div>
  );
}
