import type { Metadata } from "next";
import Link from "next/link";
import { markBeheerChecked, saveBeheer } from "@/app/(workspace)/admin/beheer/actions";
import { areaClass, fieldClass } from "@/components/form-fields";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { beheerStatuses, labelFor, projectStatuses, workspaceRoutes } from "@/lib/product";
import { formatDateNl, formatEuro, recurringStatusLabel } from "@/lib/sites";
import { loadBeheerOverview } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Beheer",
  robots: { index: false, follow: false },
};

export default async function AdminBeheerPage() {
  const { records, summary } = await loadBeheerOverview();
  const metrics = [
    { label: "Actieve diensten", value: String(summary.managedCount) },
    { label: "Actie nodig", value: String(summary.needsActionCount) },
    { label: "Zonder issues", value: String(summary.healthyCount) },
  ];

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Beheer"
        title="Beheer"
        text="Hosting, Hosting Plus en Beheer. MRR telt de afgesproken maandbedragen van actieve diensten."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Hosting", value: String(summary.hostingCount) },
          { label: "Hosting Plus", value: String(summary.hostingPlusCount) },
          { label: "Beheer", value: String(summary.beheerCount) },
          { label: "MRR", value: formatEuro(summary.mrr) },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="text-sm text-ink/45">{metric.label}</div>
            <div className="mt-5 text-3xl font-semibold tracking-tight">{metric.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="text-sm text-ink/45">{metric.label}</div>
            <div className="mt-5 text-3xl font-semibold tracking-tight">{metric.value}</div>
          </div>
        ))}
      </section>

      {records.length === 0 ? (
        <EmptyState title="Nog geen beheer" text="Bij het omzetten van een website-aanvraag komt Kopvast Beheer hier te staan." />
      ) : (
        <ul className="space-y-4">
          {records.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{item.customerName}</h2>
                    <span className="text-xs font-medium text-ink/55">{item.productName}</span>
                    <StatusBadge
                      label={
                        beheerStatuses.some((status) => status.value === item.status)
                          ? labelFor(beheerStatuses, item.status)
                          : labelFor(projectStatuses, item.status)
                      }
                      tone={toneForStatus(item.status)}
                    />
                    {item.needsAction ? (
                      <span className="text-xs font-semibold text-copper-dark">{item.healthLabel}</span>
                    ) : (
                      <span className="text-xs text-olive">{item.healthLabel}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink/45">{item.domain}</p>
                  <p className="mt-3 text-sm text-ink/55">
                    {recurringStatusLabel(item.status)} · sinds {formatDateNl(item.startedAt)} · {formatEuro(item.monthlyAmount)} per maand excl. btw · laatste check{" "}
                    {formatDateNl(item.lastCheckedAt)}
                  </p>
                  <p className="mt-2 text-sm text-ink/55">
                    Open wijzigingen {item.openChanges} · open support {item.openSupport}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {item.websiteId ? (
                    <Link href={`${workspaceRoutes.adminWebsites}/${item.websiteId}`} className="text-sm underline underline-offset-4">
                      Website
                    </Link>
                  ) : null}
                  <Link href={`${workspaceRoutes.adminCustomers}/${item.organizationId}`} className="text-sm underline underline-offset-4">
                    Klant
                  </Link>
                </div>
              </div>

              <form action={saveBeheer} className="mt-5 grid gap-3 md:grid-cols-[10rem_8rem_1fr_auto]">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="organizationId" value={item.organizationId} />
                <select name="status" defaultValue={item.status} className={fieldClass}>
                  {beheerStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                  {!beheerStatuses.some((status) => status.value === item.status) ? (
                    <option value={item.status}>{labelFor(projectStatuses, item.status)}</option>
                  ) : null}
                </select>
                <input
                  name="monthlyAmount"
                  defaultValue={String(item.monthlyAmount)}
                  inputMode="decimal"
                  className={fieldClass}
                  aria-label="Maandbedrag"
                />
                <input
                  type="date"
                  name="startedAt"
                  defaultValue={item.startedAt ?? ""}
                  className={fieldClass}
                  aria-label="Startdatum"
                />
                <button type="submit" className="text-sm underline underline-offset-4">
                  Opslaan
                </button>
                <textarea
                  name="includedNote"
                  defaultValue={item.includedNote ?? ""}
                  className={`${areaClass} min-h-24 md:col-span-4`}
                  placeholder="Inbegrepen service"
                />
              </form>
              <form action={markBeheerChecked} className="mt-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="organizationId" value={item.organizationId} />
                <button type="submit" className="text-sm underline underline-offset-4">
                  Check bijwerken
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
