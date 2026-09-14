"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { submitAanvraag } from "@/app/aanvraag/actions";
import { Field, StepNav, areaClass, fieldClass } from "@/components/form-fields";
import { assetOptions, brandStates, products, websitePages } from "@/lib/site";

const steps = ["Bedrijf", "Website", "Merk", "Pagina’s", "Bestanden", "Prijs", "Bevestiging"];

export function WebsiteAanvraagForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(submitAanvraag, null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    website: params.get("website") ?? "",
    brand: "",
    pages: [] as string[],
    assets: [] as string[],
    notes: "",
  });

  const summary = useMemo(
    () => [
      ["Bedrijf", values.company],
      ["Naam", values.name],
      ["E-mail", values.email],
      ["Website", values.website || "Nog geen website"],
      ["Merkstatus", brandStates.find((item) => item.value === values.brand)?.label ?? values.brand],
      ["Pagina’s", values.pages.join(", ")],
      ["Bestanden", values.assets.join(", ")],
    ],
    [values]
  );

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 text-3xl text-ink">Aanvraag ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          We hebben je aanvraag voor Kopvast Website opgeslagen. Je hoort van ons op het opgegeven
          e-mailadres. Stilte behandelen we niet als akkoord of opdracht.
        </p>
      </div>
    );
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    if (step < steps.length - 1) setStep((value) => value + 1);
  }

  return (
    <form
      action={step === steps.length - 1 ? action : undefined}
      onSubmit={step === steps.length - 1 ? undefined : next}
      className="space-y-6"
    >
      <input type="hidden" name="source" value="website-aanvraag" />
      <input type="hidden" name="name" value={values.name} />
      <input type="hidden" name="email" value={values.email} />
      <input type="hidden" name="company" value={values.company} />
      <input type="hidden" name="website" value={values.website} />
      <input type="hidden" name="phone" value={values.phone} />
      <input type="hidden" name="Merkstatus" value={values.brand} />
      <input type="hidden" name="Pagina's" value={values.pages.join(", ")} />
      <input type="hidden" name="Bestanden" value={values.assets.join(", ")} />
      <input type="hidden" name="message" value={values.notes} />

      <p className="text-xs tracking-[0.16em] text-olive uppercase">{steps[step]}</p>

      {step === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="company" label="Bedrijf">
            <input
              id="company"
              required
              className={fieldClass}
              value={values.company}
              onChange={(event) => setValues((current) => ({ ...current, company: event.target.value }))}
            />
          </Field>
          <Field id="name" label="Naam">
            <input
              id="name"
              required
              autoComplete="name"
              className={fieldClass}
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field id="email" label="E-mail">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className={fieldClass}
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
          <Field id="phone" label="Telefoon (optioneel)">
            <input
              id="phone"
              autoComplete="tel"
              className={fieldClass}
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <Field id="website" label="Huidige website">
          <input
            id="website"
            placeholder="jouwbedrijf.nl"
            className={fieldClass}
            value={values.website}
            onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
          />
          <p className="mt-2 text-sm text-olive">Nog geen website? Laat dit veld leeg.</p>
        </Field>
      ) : null}

      {step === 2 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Hoe staat je merk er nu voor?</legend>
          {brandStates.map((item) => (
            <label key={item.value} className="flex items-start gap-3 rounded-xl border border-stone/50 p-4">
              <input
                type="radio"
                name="brand-ui"
                required
                checked={values.brand === item.value}
                onChange={() => setValues((current) => ({ ...current, brand: item.value }))}
              />
              <span className="text-sm text-ink">{item.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Gewenste pagina’s, maximaal zes</legend>
          {websitePages.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-xl border border-stone/50 p-3">
              <input
                type="checkbox"
                checked={values.pages.includes(item)}
                disabled={!values.pages.includes(item) && values.pages.length >= 6}
                onChange={() => setValues((current) => ({ ...current, pages: toggle(current.pages, item) }))}
              />
              <span className="text-sm text-ink">{item}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Welke bestanden heb je al?</legend>
          {assetOptions.map((item) => (
            <label key={item.value} className="flex items-center gap-3 rounded-xl border border-stone/50 p-3">
              <input
                type="checkbox"
                checked={values.assets.includes(item.label)}
                onChange={() =>
                  setValues((current) => ({ ...current, assets: toggle(current.assets, item.label) }))
                }
              />
              <span className="text-sm text-ink">{item.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 5 ? (
        <div className="rounded-2xl border border-stone/50 p-6">
          <p className="text-sm text-olive">{products.website.name}</p>
          <p className="mt-2 font-heading text-5xl text-ink">{products.website.price}</p>
          <p className="mt-1 text-xs text-stone">{products.website.cadence}</p>
          <p className="mt-4 text-sm leading-6 text-olive">{products.website.summary}</p>
          <p className="mt-4 text-sm leading-6 text-olive">
            Beheer is optioneel vanaf livegang: {products.beheer.price} {products.beheer.cadence}.
          </p>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="space-y-5">
          <dl className="space-y-2 text-sm text-olive">
            {summary.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt>{label}</dt>
                <dd className="text-ink">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <Field id="notes" label="Aanvulling (optioneel)">
            <textarea
              id="notes"
              className={areaClass}
              value={values.notes}
              onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
            />
          </Field>
          <p className="text-sm leading-6 text-olive">
            We gebruiken deze gegevens alleen om je aanvraag te behandelen. Geen nieuwsbrief, geen
            automatische marketing.
          </p>
        </div>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <StepNav
        step={step}
        total={steps.length}
        onBack={() => setStep((value) => value - 1)}
        nextLabel={step === steps.length - 1 ? "Verstuur aanvraag" : "Volgende"}
        pending={pending}
      />
    </form>
  );
}
