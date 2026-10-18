"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createProspectAction, reuseProspectAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { workspaceRoutes } from "@/lib/product";
import { formatNlDate, labelForMail, labelForResponse, labelForStatus } from "@/lib/acquisition-constants";

export function NewProspectForm() {
  const [state, action] = useActionState(createProspectAction, null);
  const [hasWebsite, setHasWebsite] = useState(true);
  const [draft, setDraft] = useState({
    website: "",
    email: "",
    company: "",
    notes: "",
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    facebookUrl: "",
    socialUrl: "",
    sourceUrl: "",
  });
  const submitting = useRef(false);

  useEffect(() => {
    if (state && "ok" in state && state.ok === false) submitting.current = false;
  }, [state]);

  return (
    <div className="space-y-6">
      <form
        action={action}
        onSubmit={(event) => {
          if (submitting.current) {
            event.preventDefault();
            return;
          }
          submitting.current = true;
          const data = new FormData(event.currentTarget);
          setDraft({
            website: String(data.get("website") ?? ""),
            email: String(data.get("email") ?? ""),
            company: String(data.get("company") ?? ""),
            notes: String(data.get("notes") ?? ""),
            firstName: String(data.get("firstName") ?? ""),
            lastName: String(data.get("lastName") ?? ""),
            phone: String(data.get("phone") ?? ""),
            city: String(data.get("city") ?? ""),
            facebookUrl: String(data.get("facebookUrl") ?? ""),
            socialUrl: String(data.get("socialUrl") ?? ""),
            sourceUrl: String(data.get("sourceUrl") ?? ""),
          });
        }}
        className="relative space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6"
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Website aanwezig</legend>
          <label className="mr-4 text-sm">
            <input type="radio" name="hasWebsite" value="ja" checked={hasWebsite} onChange={() => setHasWebsite(true)} /> Ja
          </label>
          <label className="text-sm">
            <input type="radio" name="hasWebsite" value="nee" checked={!hasWebsite} onChange={() => setHasWebsite(false)} /> Nee
          </label>
        </fieldset>
        {hasWebsite ? (
          <Field id="website" label="Website">
            <input
              id="website"
              name="website"
              required
              inputMode="url"
              autoComplete="url"
              placeholder="https://bedrijf.nl"
              value={draft.website}
              onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
              className={fieldClass}
            />
          </Field>
        ) : null}
        <Field id="company" label="Bedrijfsnaam">
          <input
            id="company"
            name="company"
            required={!hasWebsite}
            placeholder={hasWebsite ? "Optioneel" : "Verplicht zonder website"}
            value={draft.company}
            onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Voornaam">
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              placeholder="Optioneel"
              value={draft.firstName}
              onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
              className={fieldClass}
            />
          </Field>
          <Field id="lastName" label="Achternaam">
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              placeholder="Optioneel"
              value={draft.lastName}
              onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field id="email" label="E-mailadres">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Ook een Gmailadres is geldig"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="phone" label="Telefoon">
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Optioneel"
            value={draft.phone}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="facebookUrl" label="Facebook">
          <input
            id="facebookUrl"
            name="facebookUrl"
            inputMode="url"
            placeholder="Optioneel, dit is geen website"
            value={draft.facebookUrl}
            onChange={(event) => setDraft((current) => ({ ...current, facebookUrl: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="socialUrl" label="Andere social URL">
          <input
            id="socialUrl"
            name="socialUrl"
            inputMode="url"
            placeholder="Optioneel"
            value={draft.socialUrl}
            onChange={(event) => setDraft((current) => ({ ...current, socialUrl: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="city" label="Vestigingsplaats">
          <input
            id="city"
            name="city"
            placeholder="Optioneel"
            value={draft.city}
            onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="sourceType" label="Bron">
          <select id="sourceType" name="sourceType" defaultValue="kopvast" className={fieldClass}>
            <option value="kopvast">Handmatig</option>
            <option value="referral">Doorverwijzing</option>
            <option value="import">Import</option>
          </select>
        </Field>
        <Field id="sourceUrl" label="Bron-URL">
          <input
            id="sourceUrl"
            name="sourceUrl"
            placeholder="Optioneel"
            value={draft.sourceUrl}
            onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))}
            className={fieldClass}
          />
        </Field>
        <Field id="notes" label="Persoonlijke notitie">
          <textarea
            id="notes"
            name="notes"
            placeholder="Interne context, optioneel"
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            className={areaClass}
          />
        </Field>
        {state && "ok" in state && state.ok === false && "message" in state ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <FormBusyOverlay label={hasWebsite ? "Website scannen… dit kan even duren." : "Prospect opslaan…"} />
        <SubmitButton
          pendingLabel={hasWebsite ? "Website scannen…" : "Opslaan…"}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory sm:w-auto"
        >
          {hasWebsite ? "Scan website" : "Prospect opslaan"}
        </SubmitButton>
      </form>

      {state && "duplicate" in state && state.duplicate ? (
        <ExistingCard
          title="Dit bedrijf staat al in Kopvast."
          existing={state.existing}
          draft={draft}
          warning={state.suppressed ? `Suppression: ${state.suppressed.reason}` : undefined}
        />
      ) : null}

      {state && "emailConflict" in state && state.emailConflict ? (
        <ExistingCard
          title="Dit e-mailadres hoort al bij een andere prospect."
          existing={state.existing}
          draft={draft}
        />
      ) : null}
    </div>
  );
}

function ExistingCard({
  title,
  existing,
  draft,
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
  draft: { website: string; email: string; company: string; notes: string };
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
        <form action={reuseProspectAction} className="relative">
          <input type="hidden" name="prospectId" value={existing.id} />
          <input type="hidden" name="website" value={draft.website || existing.domain} />
          <input type="hidden" name="email" value={draft.email || existing.email || ""} />
          {draft.company ? <input type="hidden" name="company" value={draft.company} /> : null}
          {draft.notes ? <input type="hidden" name="notes" value={draft.notes} /> : null}
          <FormBusyOverlay label="Nieuwe scan starten…" />
          <SubmitButton
            pendingLabel="Nieuwe scan starten…"
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md border border-ink/15 bg-white px-5 text-sm font-semibold"
          >
            Nieuwe scan uitvoeren
          </SubmitButton>
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
