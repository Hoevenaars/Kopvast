import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveNextAction, saveOnboarding, savePlanning, saveWebsite } from "@/app/(workspace)/admin/opdrachten/actions";
import { OrderStatusForm } from "@/app/(workspace)/admin/opdrachten/status-form";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { Field, areaClass, fieldClass } from "@/components/form-fields";
import { formatNlDate } from "@/lib/acquisition-constants";
import {
  formatEuro,
  labelForOrderStatus,
  NEXT_ACTION_EXAMPLES,
  onboardingStatusFromProgress,
} from "@/lib/orders";
import { loadOrderDetail } from "@/lib/order-ops";
import { workspaceRoutes } from "@/lib/product";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadOrderDetail(id);
  return { title: detail?.order.order_number || "Opdracht", robots: { index: false, follow: false } };
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadOrderDetail(id);
  if (!detail) notFound();
  const { order, proposal, organization, onboarding, website, invoices, activities } = detail;
  const snapshot = order.proposal_snapshot;
  const onboardingDone = onboarding ? onboarding.progress.filter((step) => step.done).length : 0;
  const onboardingTotal = onboarding?.progress.length ?? 0;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow={order.order_number}
        title={organization?.name || snapshot.companyName || snapshot.customerName}
        text={order.product_label}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Klant" value={organization?.name || snapshot.companyName || "—"} />
        <Stat label="Ordernummer" value={order.order_number} />
        <Stat label="Product" value={order.product_label} />
        <Stat
          label="Status"
          value={labelForOrderStatus(order.status)}
        />
        <Stat label="Prijs" value={order.agreed_price_label || formatEuro(order.agreed_price_amount)} />
        <Stat label="Beheer" value={order.include_recurring_beheer ? order.recurring_price_label || "€199 / maand" : "Niet meegenomen"} />
        <Stat label="Target live" value={formatNlDate(order.target_live_at)} />
        <Stat label="Next action" value={order.next_action || "—"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Klant</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Bedrijf" value={organization?.name || snapshot.companyName} />
            <Row label="Contact" value={snapshot.customerName} />
            <Row label="E-mail" value={snapshot.customerEmail} />
            <Row label="Website" value={organization?.website || snapshot.website} />
          </dl>
          {organization ? (
            <Link href={`${workspaceRoutes.adminCustomers}/${organization.id}`} className="mt-4 inline-block text-sm underline underline-offset-4">
              Open klantdossier
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Statusflow</h2>
          <p className="mt-1 text-sm text-ink/45">Handmatig wijzigen mag. Kritieke stappen overslaan alleen met override.</p>
          <div className="mt-4">
            <OrderStatusForm key={order.status} orderId={order.id} status={order.status} visited={order.visited_statuses} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Voorstel-snapshot</h2>
        <p className="mt-1 text-sm text-ink/45">De commerciële afspraak op het moment van akkoord. Daarna wijzigt dit niet meer met de orderstatus.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <Row label="Product" value={snapshot.productLabel} />
          <Row label="Prijs" value={snapshot.priceLabel} />
          <Row label="Beheer" value={snapshot.includeRecurringBeheer ? snapshot.recurringLabel : "Nee"} />
          <Row label="Akkoord" value={formatNlDate(snapshot.acceptedAt)} />
          <Row label="Voorstelstatus" value={proposal?.status ?? "ACCEPTED"} />
          <Row label="Scope" value={order.scope || snapshot.scope} />
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Onboarding</h2>
          <p className="mt-1 text-sm text-ink/45">
            {onboarding
              ? `${onboardingDone}/${onboardingTotal} · ${onboardingStatusFromProgress(onboarding.progress) === "DONE" ? "Afgerond" : "In uitvoering"}`
              : "Nog niet gekoppeld"}
          </p>
          {detail.deliveryOnboardingHref ? (
            <Link
              href={detail.deliveryOnboardingHref}
              className="mt-4 inline-flex h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-ivory"
            >
              Open projectonboarding
            </Link>
          ) : null}
          {detail.productionHref ? (
            <Link href={detail.productionHref} className="mt-3 inline-block text-sm underline underline-offset-4">
              Open productie
            </Link>
          ) : null}
          {onboarding ? (
            <form action={saveOnboarding} className="relative mt-4 space-y-3">
              <FormBusyOverlay label="Onboarding opslaan…" />
              <input type="hidden" name="id" value={order.id} />
              {onboarding.progress.map((step) => (
                <label key={step.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="done" value={step.id} defaultChecked={step.done} />
                  {step.title}
                </label>
              ))}
              <SubmitButton className="text-sm underline underline-offset-4" pendingLabel="Opslaan…">
                Voortgang opslaan
              </SubmitButton>
            </form>
          ) : detail.deliveryOnboardingHref ? (
            <p className="mt-4 text-sm text-ink/45">De checklist staat bij projectonboarding, niet als losse orderstappen.</p>
          ) : (
            <EmptyState title="Geen onboarding" text="Bij het aanmaken van de opdracht hoort hier een checklist." />
          )}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Next action</h2>
          <form action={saveNextAction} className="relative mt-4 space-y-3">
            <FormBusyOverlay label="Actie opslaan…" />
            <input type="hidden" name="id" value={order.id} />
            <Field id="nextAction" label="Actie">
              <input id="nextAction" name="nextAction" required defaultValue={order.next_action ?? ""} className={fieldClass} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {NEXT_ACTION_EXAMPLES.map((example) => (
                <span key={example} className="rounded-full bg-ivory px-3 py-1 text-xs text-ink/55">
                  {example}
                </span>
              ))}
            </div>
            <Field id="nextActionAt" label="Datum">
              <input id="nextActionAt" name="nextActionAt" type="date" defaultValue={order.next_action_at ?? ""} className={fieldClass} />
            </Field>
            <Field id="nextActionOwner" label="Owner (optioneel)">
              <input id="nextActionOwner" name="nextActionOwner" defaultValue={order.next_action_owner ?? ""} className={fieldClass} />
            </Field>
            <SubmitButton className="text-sm underline underline-offset-4" pendingLabel="Opslaan…">
              Actie opslaan
            </SubmitButton>
          </form>
        </section>
      </div>

      <form action={savePlanning} className="relative grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <FormBusyOverlay label="Planning opslaan…" />
        <input type="hidden" name="id" value={order.id} />
        <div className="md:col-span-2">
          <h2 className="font-semibold">Planning, productie en review</h2>
        </div>
        <Field id="targetLiveAt" label="Target live">
          <input id="targetLiveAt" name="targetLiveAt" type="date" defaultValue={order.target_live_at ?? ""} className={fieldClass} />
        </Field>
        <div className="flex items-end">
          <StatusBadge label={labelForOrderStatus(order.status)} tone={toneForStatus(order.status)} />
        </div>
        <Field id="productionNotes" label="Productie">
          <textarea id="productionNotes" name="productionNotes" defaultValue={order.production_notes ?? ""} className={areaClass} />
        </Field>
        <Field id="reviewNotes" label="Review / wijzigingen">
          <textarea id="reviewNotes" name="reviewNotes" defaultValue={order.review_notes ?? ""} className={areaClass} />
        </Field>
        <SubmitButton className="text-sm underline underline-offset-4" pendingLabel="Opslaan…">
          Planning opslaan
        </SubmitButton>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Website</h2>
          {website ? (
            <form action={saveWebsite} className="relative mt-4 space-y-3">
              <FormBusyOverlay label="Website opslaan…" />
              <input type="hidden" name="id" value={order.id} />
              <Row label="Status" value={website.status} />
              <Field id="domain" label="Domein">
                <input id="domain" name="domain" defaultValue={website.domain ?? ""} className={fieldClass} />
              </Field>
              <SubmitButton className="text-sm underline underline-offset-4" pendingLabel="Opslaan…">
                Website opslaan
              </SubmitButton>
            </form>
          ) : (
            <EmptyState title="Nog geen website" text="Elke opdracht krijgt bij akkoord een gekoppelde website." />
          )}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Facturatie</h2>
          <Link href={workspaceRoutes.adminInvoices} className="mt-1 inline-block text-sm underline underline-offset-4">
            Open facturatie
          </Link>
          {invoices.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Geen facturen" text="Bij akkoord ontstaan conceptfacturen vanuit de afgesproken prijs." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-ink/8">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{invoice.label}</p>
                    <p className="text-ink/45">{invoice.kind} · {invoice.status}</p>
                  </div>
                  <p>{formatEuro(invoice.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Activity</h2>
        {activities.length === 0 ? (
          <p className="mt-3 text-sm text-ink/45">Nog geen activiteit.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {activities.map((item) => (
              <li key={item.id} className="border-b border-ink/6 pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{item.body || item.event_type}</p>
                <p className="mt-1 text-xs text-ink/40">
                  {item.actor_id || "systeem"} · {new Date(item.created_at).toLocaleString("nl-NL")}
                  {item.old_status && item.new_status && item.old_status !== item.new_status
                    ? ` · ${labelForOrderStatus(item.old_status)} → ${labelForOrderStatus(item.new_status)}`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <dt className="text-ink/45">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
