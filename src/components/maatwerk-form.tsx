"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { submitAanvraag } from "@/app/aanvraag/actions";
import { Field, StepNav, areaClass, fieldClass } from "@/components/form-fields";
import { customFeatures, sizeOptions, timingOptions } from "@/lib/site";

const steps = ["Idee", "Website", "Functionaliteit", "Omvang", "Timing", "Contact"];

export function MaatwerkForm() {
  const params = useSearchParams();
  const preset = params.get("type") ?? "";
  const [state, action, pending] = useActionState(submitAanvraag, null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    idea:
      preset === "campagne"
        ? "Campagne of landingspagina in bestaande merkstijl"
        : preset === "merk"
          ? "Merkrefresh"
          : preset === "sjablonen"
            ? "Sjablonen / marketingmiddelen"
            : "",
    website: "",
    features: preset ? [preset] : ([] as string[]),
    size: "",
    timing: "",
    name: "",
    email: "",
    company: "",
    phone: "",
  });

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 text-3xl text-ink">Idee ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          {state.emailed
            ? "We beoordelen wat nodig en haalbaar is. Je krijgt geen automatische vaste prijs. We nemen contact op via het opgegeven e-mailadres."
            : "We beoordelen wat nodig en haalbaar is. Je krijgt geen automatische vaste prijs. We nemen contact met je op."}
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
      <input type="hidden" name="source" value="maatwerk" />
      <input type="hidden" name="name" value={values.name} />
      <input type="hidden" name="email" value={values.email} />
      <input type="hidden" name="company" value={values.company} />
      <input type="hidden" name="website" value={values.website} />
      <input type="hidden" name="phone" value={values.phone} />
      <input type="hidden" name="Idee" value={values.idea} />
      <input type="hidden" name="Functionaliteit" value={values.features.join(", ")} />
      <input type="hidden" name="Omvang" value={values.size} />
      <input type="hidden" name="Timing" value={values.timing} />
      <input type="hidden" name="message" value={values.idea} />

      <p className="text-xs tracking-[0.16em] text-olive uppercase">{steps[step]}</p>

      {step === 0 ? (
        <Field id="idea" label="Wat wil je laten maken?">
          <textarea
            id="idea"
            required
            className={areaClass}
            value={values.idea}
            onChange={(event) => setValues((current) => ({ ...current, idea: event.target.value }))}
            placeholder="Bijvoorbeeld een grotere website, webshop, reserveringssysteem of campagne."
          />
        </Field>
      ) : null}

      {step === 1 ? (
        <Field id="website" label="Bestaande website">
          <input
            id="website"
            className={fieldClass}
            placeholder="jouwbedrijf.nl"
            value={values.website}
            onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
          />
        </Field>
      ) : null}

      {step === 2 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Gewenste functionaliteit</legend>
          {customFeatures.map((item) => (
            <label key={item.value} className="flex items-center gap-3 rounded-xl border border-stone/50 p-3">
              <input
                type="checkbox"
                checked={values.features.includes(item.label)}
                onChange={() =>
                  setValues((current) => ({ ...current, features: toggle(current.features, item.label) }))
                }
              />
              <span className="text-sm text-ink">{item.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Indicatieve omvang</legend>
          {sizeOptions.map((item) => (
            <label key={item.value} className="block rounded-xl border border-stone/50 p-4">
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="size-ui"
                  required
                  checked={values.size === item.label}
                  onChange={() => setValues((current) => ({ ...current, size: item.label }))}
                />
                <span className="text-sm font-medium text-ink">{item.label}</span>
              </span>
              <span className="mt-2 block pl-7 text-sm text-olive">{item.text}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Gewenste timing</legend>
          {timingOptions.map((item) => (
            <label key={item.value} className="flex items-center gap-3 rounded-xl border border-stone/50 p-4">
              <input
                type="radio"
                name="timing-ui"
                required
                checked={values.timing === item.label}
                onChange={() => setValues((current) => ({ ...current, timing: item.label }))}
              />
              <span className="text-sm text-ink">{item.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="name" label="Naam">
            <input
              id="name"
              required
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
              className={fieldClass}
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
          <Field id="company" label="Bedrijf">
            <input
              id="company"
              className={fieldClass}
              value={values.company}
              onChange={(event) => setValues((current) => ({ ...current, company: event.target.value }))}
            />
          </Field>
          <Field id="phone" label="Telefoon (optioneel)">
            <input
              id="phone"
              className={fieldClass}
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
          <p className="text-sm leading-6 text-olive md:col-span-2">
            We beoordelen je vraag persoonlijk. Je krijgt geen automatische pakketprijs.
          </p>
        </div>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <StepNav
        step={step}
        total={steps.length}
        onBack={() => setStep((value) => value - 1)}
        nextLabel={step === steps.length - 1 ? "Verstuur mijn idee" : "Volgende"}
        pending={pending}
      />
    </form>
  );
}
