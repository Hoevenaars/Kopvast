import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  convertAanvraagAction,
  saveCallNoteAction,
  saveNextActionForm,
  updateQualificationAction,
} from "@/app/(workspace)/admin/aanvragen/actions";
import { ProposalButton } from "@/app/(workspace)/admin/aanvragen/proposal-button";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { PageIntro } from "@/components/workspace/page-frame";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { loadAanvraag, organizationLabel } from "@/lib/aanvragen";
import { aanvraagStatuses, requestBron } from "@/lib/aanvragen-model";
import { FINDING_CATEGORY_LABELS, formatNlDate, labelForFit, productFits } from "@/lib/acquisition-constants";
import { labelFor } from "@/lib/product";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await loadAanvraag(id);
  return { title: row ? organizationLabel(row) : "Aanvraag", robots: { index: false, follow: false } };
}

export default async function AanvraagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await loadAanvraag(id);
  if (!row) notFound();

  const original = [
    ["Type", row.type],
    ["Bron", requestBron(row)],
    ["Pagina's", row.pages],
    ["Merk", row.has_brand],
    ["Idee", row.request_detail],
    ["Functionaliteit", row.functionality],
    ["Omvang", row.scale],
    ["Timing", row.timing],
    ["Toelichting", row.notes],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Aanvraag"
        title={organizationLabel(row)}
        text={row.website || row.email}
        action={<ProposalButton leadId={row.id} proposalId={row.proposal?.id ?? row.proposal_id} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={labelForFit(row.product_fit)} tone={row.product_fit === "CUSTOM_FIT" ? "copper" : "ink"} />
        <StatusBadge label={labelFor(aanvraagStatuses, row.status)} tone={toneForStatus(row.status)} />
        <p className="text-sm text-ink/45">{formatNlDate(row.created_at)}</p>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Originele aanvraag</h2>
        {original.length === 0 ? (
          <p className="mt-3 text-sm text-ink/45">Geen extra formulierdetails.</p>
        ) : (
          <dl className="mt-4 divide-y divide-ink/6">
            {original.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-ink/45">{label}</dt>
                <dd className="text-sm text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Contact</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Item label="Naam" value={row.name} />
          <Item label="E-mail" value={row.email} href={`mailto:${row.email}`} />
          <Item label="Telefoon" value={row.phone || "—"} />
          <Item label="Organisatie" value={row.company_name || "—"} />
          <Item label="Website" value={row.website || "—"} href={row.website || undefined} />
          <Item label="Bron" value={requestBron(row)} />
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={updateQualificationAction} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <FormBusyOverlay label="Kwalificatie opslaan…" />
          <h2 className="font-semibold">Kwalificatie</h2>
          <input type="hidden" name="id" value={row.id} />
          <Field id="productFit" label="Product fit">
            <select id="productFit" name="productFit" defaultValue={row.product_fit ?? "REVIEW_REQUIRED"} className={fieldClass}>
              {productFits.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="status" label="Status">
            <select id="status" name="status" defaultValue={row.status} className={fieldClass}>
              {aanvraagStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="qualificationNotes" label="Toelichting">
            <textarea
              id="qualificationNotes"
              name="qualificationNotes"
              defaultValue={row.qualification_notes ?? ""}
              placeholder="Waarom STANDARD_FIT of CUSTOM_FIT?"
              className={areaClass}
            />
          </Field>
          {row.product_fit === "CUSTOM_FIT" ? (
            <p className="text-sm text-ink/55">Maatwerk: geen vast pakket en geen €995 forceren.</p>
          ) : null}
          <SubmitButton pendingLabel="Opslaan…" className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
            Kwalificatie opslaan
          </SubmitButton>
        </form>

        <form action={saveCallNoteAction} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <FormBusyOverlay label="Gesprek opslaan…" />
          <h2 className="font-semibold">Gesprek / call note</h2>
          <input type="hidden" name="id" value={row.id} />
          <Field id="callNotes" label="Call note">
            <textarea
              id="callNotes"
              name="callNotes"
              defaultValue={row.call_notes ?? ""}
              placeholder="Wat is er besproken?"
              className={areaClass}
            />
          </Field>
          <SubmitButton pendingLabel="Opslaan…" className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
            Call note opslaan
          </SubmitButton>
        </form>
      </section>

      {row.scan ? (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Scan en kernfindings</h2>
            <Link href={row.scan.href} className="text-sm font-medium underline underline-offset-4">
              Open acquisitiescan
            </Link>
          </div>
          <p className="mt-2 text-sm text-ink/45">
            {row.scan.company} · {row.scan.domain}
          </p>
          {row.scan.findings.length === 0 ? (
            <p className="mt-3 text-sm text-ink/45">Nog geen findings gekoppeld.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {row.scan.findings.map((finding, index) => (
                <li key={finding.id} className="border-b border-ink/6 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold">
                    {index + 1}. {FINDING_CATEGORY_LABELS[finding.category] || finding.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{finding.description}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={saveNextActionForm} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <FormBusyOverlay label="Volgende actie opslaan…" />
          <h2 className="font-semibold">Volgende actie</h2>
          <input type="hidden" name="id" value={row.id} />
          <Field id="nextAction" label="Actie">
            <input
              id="nextAction"
              name="nextAction"
              defaultValue={row.next_action ?? ""}
              placeholder="Bel terug, voorstel sturen…"
              className={fieldClass}
            />
          </Field>
          <Field id="nextActionAt" label="Wanneer">
            <input
              id="nextActionAt"
              name="nextActionAt"
              type="datetime-local"
              defaultValue={row.next_action_at ? row.next_action_at.slice(0, 16) : ""}
              className={fieldClass}
            />
          </Field>
          <SubmitButton pendingLabel="Opslaan…" className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
            Volgende actie opslaan
          </SubmitButton>
        </form>

        {row.status !== "OMGEZET" ? (
          <form action={convertAanvraagAction} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
            <FormBusyOverlay label="Omzetten naar klant…" />
            <h2 className="font-semibold">Klant maken</h2>
            <p className="text-sm leading-6 text-ink/55">
              Zet een gewonnen aanvraag om naar een klanomgeving. Dit raakt de scanner niet.
            </p>
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton
              pendingLabel="Omzetten…"
              className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
            >
              Zet om naar klant
            </SubmitButton>
          </form>
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm text-olive">Deze aanvraag is omgezet naar een klant.</div>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Activiteit</h2>
        {row.activities.length === 0 ? (
          <p className="mt-3 text-sm text-ink/45">Nog geen activiteit vastgelegd.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/6">
            {row.activities.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{activityLabel(item.event_type)}</span>
                <span className="text-xs text-ink/40">
                  {item.actor_id} · {new Date(item.created_at).toLocaleString("nl-NL")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Item({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className="mt-1 text-sm font-medium">
        {href ? (
          <a href={href} className="underline underline-offset-4">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function activityLabel(value: string) {
  const labels: Record<string, string> = {
    REQUEST_CREATED: "Aanvraag aangemaakt",
    STATUS_UPDATED: "Status bijgewerkt",
    PRODUCT_FIT_SET: "Kwalificatie opgeslagen",
    CALL_NOTE_SAVED: "Call note opgeslagen",
    NEXT_ACTION_SET: "Volgende actie gezet",
    PROPOSAL_CREATED: "Voorstel gemaakt",
    PROPOSAL_UPDATED: "Voorstel bijgewerkt",
  };
  return labels[value] ?? value;
}
