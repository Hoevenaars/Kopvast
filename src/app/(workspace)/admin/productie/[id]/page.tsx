import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  markLiveAction,
  markOnboardingAction,
  resubmitReviewAction,
  saveChangeStatusAction,
  saveLaunchCheckAction,
  saveProductionMetaAction,
  sendToReviewAction,
  startProductionAction,
} from "@/app/(workspace)/admin/productie/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import {
  allChangesDone,
  changeRequestStatuses,
  formatDueLabel,
  launchCheckItems,
  launchCheckStats,
  productionStatuses,
} from "@/lib/production";
import { labelFor, projectStatuses, workspaceRoutes } from "@/lib/product";
import { loadProductionDetail } from "@/lib/production-board";

export const metadata: Metadata = {
  title: "Productie",
  robots: { index: false, follow: false },
};

export default async function AdminProductionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { id } = await params;
  const { fout } = await searchParams;
  const detail = await loadProductionDetail(id);
  if (!detail) notFound();
  const { production, organization, project, changes, approvals, activity, conceptApproval, finalApproval } = detail;
  const checks = launchCheckStats(production.launch_checks);
  const canResubmit = allChangesDone(changes) && production.status === "changes";
  const liveReady = production.status === "ready_to_launch" || (Boolean(finalApproval) && checks.complete);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Productie"
        title={organization.name}
        text={production.order}
        action={
          <Link href={`${workspaceRoutes.adminCustomers}/${organization.id}`} className="text-sm underline underline-offset-4">
            Naar klant
          </Link>
        }
      />
      {fout ? <p className="rounded-md border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">{fout}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={labelFor(productionStatuses, production.status)} tone={toneForStatus(production.status)} />
        <StatusBadge label={labelFor(projectStatuses, project.status)} tone={toneForStatus(project.status)} />
        <p className="text-sm text-olive">Doeldatum {formatDueLabel(production.due_at)}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Scope" value={production.scope || "Nog niet vastgelegd"} />
        <InfoCard
          label="Onboarding"
          value={production.onboarding_complete ? "Compleet" : "Incompleet"}
        />
        <InfoCard
          label="Preview"
          value={production.preview_url || "Nog geen URL"}
          href={production.preview_url}
        />
        <InfoCard label="Volgende actie" value={production.next_action || "—"} />
      </section>

      <form action={saveProductionMetaAction} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <input type="hidden" name="id" value={production.id} />
        <input type="hidden" name="organizationId" value={organization.id} />
        <Field id="scope" label="Scope">
          <textarea id="scope" name="scope" defaultValue={production.scope ?? ""} className={areaClass} />
        </Field>
        <div className="space-y-4">
          <Field id="dueAt" label="Doeldatum">
            <input id="dueAt" name="dueAt" type="date" defaultValue={production.due_at ?? ""} className={fieldClass} />
          </Field>
          <Field id="nextAction" label="Volgende actie">
            <input id="nextAction" name="nextAction" defaultValue={production.next_action ?? ""} className={fieldClass} />
          </Field>
          <Field id="blockers" label="Blockers">
            <input id="blockers" name="blockers" defaultValue={production.blockers ?? ""} className={fieldClass} />
          </Field>
        </div>
        <button type="submit" className="text-sm underline underline-offset-4">
          Gegevens opslaan
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        {!production.onboarding_complete ? (
          <ActionButton action={markOnboardingAction} id={production.id} organizationId={organization.id} label="Onboarding compleet" />
        ) : null}
        {production.status === "ready_for_production" ? (
          <ActionButton action={startProductionAction} id={production.id} organizationId={organization.id} label="Start productie" />
        ) : null}
        {canResubmit ? (
          <ActionButton action={resubmitReviewAction} id={production.id} organizationId={organization.id} label="Opnieuw ter review" />
        ) : null}
        {production.status !== "live" && liveReady ? (
          <ActionButton action={markLiveAction} id={production.id} organizationId={organization.id} label="Markeer als live" strong />
        ) : null}
      </div>

      {production.status !== "live" ? (
        <form action={sendToReviewAction} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <input type="hidden" name="id" value={production.id} />
          <input type="hidden" name="organizationId" value={organization.id} />
          <h2 className="text-lg font-semibold">Naar klantreview</h2>
          <p className="text-sm leading-6 text-ink/50">Vereist een preview-URL en een korte boodschap. De klant ziet die in Goedkeuringen.</p>
          <Field id="previewUrl" label="Preview-URL">
            <input
              id="previewUrl"
              name="previewUrl"
              required
              defaultValue={production.preview_url ?? ""}
              className={fieldClass}
              placeholder="https://preview.kopvast.nl/…"
            />
          </Field>
          <Field id="reviewMessage" label="Reviewboodschap">
            <textarea
              id="reviewMessage"
              name="reviewMessage"
              required
              defaultValue={production.review_message ?? ""}
              className={areaClass}
              placeholder="Bekijk het concept. Geef akkoord of geef wijzigingen door."
            />
          </Field>
          <button type="submit" className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory">
            Naar klantreview
          </button>
        </form>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Wijzigingen</h2>
        {changes.length === 0 ? (
          <EmptyState title="Geen wijzigingen" text="De klant geeft wijzigingen door tijdens de conceptreview." />
        ) : (
          <ul className="space-y-3">
            {changes.map((item) => (
              <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-olive">{item.page_section}</p>
                    <p className="mt-1 text-sm leading-6 text-ink">{item.body}</p>
                    {item.file_url ? (
                      <a href={item.file_url} className="mt-2 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
                        {item.file_name || item.file_url}
                      </a>
                    ) : null}
                  </div>
                  <StatusBadge label={labelFor(changeRequestStatuses, item.status)} tone={toneForStatus(item.status)} />
                </div>
                <form action={saveChangeStatusAction} className="mt-4 flex items-center gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="productionId" value={production.id} />
                  <select name="status" defaultValue={item.status} className={fieldClass}>
                    {changeRequestStatuses.map((status) => (
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

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Akkoorden</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            label="Concept"
            value={conceptApproval ? `${conceptApproval.name} · ${new Date(conceptApproval.created_at).toLocaleString("nl-NL")}` : "Nog niet"}
          />
          <InfoCard
            label="Definitief"
            value={finalApproval ? `${finalApproval.name} · ${new Date(finalApproval.created_at).toLocaleString("nl-NL")}` : "Nog niet"}
          />
        </div>
        {approvals.length ? (
          <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
            {approvals.map((item) => (
              <li key={item.id} className="px-5 py-4 text-sm">
                <p className="font-semibold">{item.kind === "final" ? "Definitief akkoord" : "Conceptakkoord"}</p>
                <p className="mt-1 text-ink/50">
                  {item.name} · {item.email} · {new Date(item.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl text-ink">Livegang-checklist</h2>
          <p className="text-sm text-ink/45">
            {checks.done}/{checks.total}
          </p>
        </div>
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {launchCheckItems.map((item) => {
            const checked = production.launch_checks[item.key];
            const locked = item.key === "final_approval" && Boolean(finalApproval);
            return (
              <li key={item.key} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm">{item.label}</span>
                <form action={saveLaunchCheckAction}>
                  <input type="hidden" name="id" value={production.id} />
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="key" value={item.key} />
                  <input type="hidden" name="checked" value={checked ? "0" : "1"} />
                  <button
                    type="submit"
                    disabled={locked}
                    className="text-sm underline underline-offset-4 disabled:no-underline disabled:opacity-50"
                  >
                    {checked ? "Afgevinkt" : "Aanvinken"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      {production.status === "live" ? (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Live</p>
          <h2 className="mt-2 text-lg font-semibold">Website is live</h2>
          <p className="mt-2 text-sm leading-6 text-ink/50">
            Live sinds {production.live_at ? new Date(production.live_at).toLocaleString("nl-NL") : "—"}.
            {production.beheer_sold ? " Kopvast Beheer is geactiveerd." : " Geen beheer verkocht."} Volgende actie: factuur / beheercheck.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Activiteit</h2>
        {activity.length === 0 ? (
          <EmptyState title="Nog geen activiteit" text="Statuswijzigingen, reviews en akkoorden komen hier." />
        ) : (
          <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
            {activity.map((item) => (
              <li key={item.id} className="px-5 py-4 text-sm">
                <p className="font-semibold">{item.detail || item.event_type}</p>
                <p className="mt-1 text-ink/45">
                  {item.actor_email || "Kopvast"} · {new Date(item.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">{label}</p>
      {href ? (
        <a href={href} className="mt-2 block text-sm font-semibold underline underline-offset-4" target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-semibold">{value}</p>
      )}
    </div>
  );
}

function ActionButton({
  action,
  id,
  organizationId,
  label,
  strong,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  organizationId: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <button
        type="submit"
        className={
          strong
            ? "inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
            : "inline-flex h-11 items-center rounded-md border border-ink/15 bg-white px-5 text-sm"
        }
      >
        {label}
      </button>
    </form>
  );
}
