"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProspectAction, reuseProspectAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { workspaceRoutes } from "@/lib/product";
import { formatNlDate, labelForMail, labelForResponse, labelForStatus } from "@/lib/acquisition-constants";

export function NewProspectForm() {
  const [state, action, pending] = useActionState(createProspectAction, null);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <Field id="website" label="Website">
          <input
            id="website"
            name="website"
            required
            inputMode="url"
            autoComplete="url"
            placeholder="https://bedrijf.nl"
            className={fieldClass}
          />
        </Field>
        <Field id="email" label="E-mailadres">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="info@bedrijf.nl"
            className={fieldClass}
          />
        </Field>
        <Field id="company" label="Bedrijfsnaam">
          <input id="company" name="company" placeholder="Optioneel" className={fieldClass} />
        </Field>
        <Field id="notes" label="Notitie">
          <textarea id="notes" name="notes" placeholder="Interne context, optioneel" className={areaClass} />
        </Field>
        {state && "ok" in state && state.ok === false && "message" in state ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Website scannen…" : "Scan website"}
        </button>
      </form>

      {state && "duplicate" in state && state.duplicate ? (
        <ExistingCard
          title="Dit bedrijf staat al in Kopvast."
          existing={state.existing}
          warning={state.suppressed ? `Suppression: ${state.suppressed.reason}` : undefined}
        />
      ) : null}

      {state && "emailConflict" in state && state.emailConflict ? (
        <ExistingCard
          title="Dit e-mailadres hoort al bij een andere prospect."
          existing={state.existing}
        />
      ) : null}
    </div>
  );
}

function ExistingCard({
  title,
  existing,
  warning,
}: {
  title: string;
  existing: {
    id: string;
    company_name: string | null;
    domain: string;
    status: string;
    opportunity_score: number | null;
    last_scan_at: string | null;
    last_contacted_at: string | null;
    response_status: string | null;
    mail_status: string | null;
    email: string | null;
  };
  warning?: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-copper/30 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {warning ? <p className="mt-1 text-sm text-copper-dark">{warning}</p> : null}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Item label="Bedrijf" value={existing.company_name || existing.domain} />
        <Item label="Domein" value={existing.domain} />
        <Item label="Status" value={labelForStatus(existing.status)} />
        <Item label="Vorige scan" value={formatNlDate(existing.last_scan_at)} />
        <Item label="Laatste contact" value={formatNlDate(existing.last_contacted_at)} />
        <Item label="Mail" value={labelForMail(existing.mail_status)} />
        <Item label="Response" value={labelForResponse(existing.response_status)} />
        <Item label="E-mail" value={existing.email || "—"} />
      </dl>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`${workspaceRoutes.adminAcquisition}/${existing.id}`}
          className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
        >
          Open bestaande prospect
        </Link>
        <form action={reuseProspectAction}>
          <input type="hidden" name="prospectId" value={existing.id} />
          <input type="hidden" name="website" value={existing.domain} />
          {existing.email ? <input type="hidden" name="email" value={existing.email} /> : null}
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-md border border-ink/15 bg-white px-5 text-sm font-semibold"
          >
            Nieuwe scan uitvoeren
          </button>
        </form>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
