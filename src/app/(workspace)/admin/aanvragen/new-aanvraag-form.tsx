"use client";

import { useActionState, useEffect, useRef } from "react";
import { createManualAanvraagAction } from "@/app/(workspace)/admin/aanvragen/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { aanvraagStatuses } from "@/lib/aanvragen-model";
import { productFits } from "@/lib/acquisition-constants";

export function NewAanvraagForm() {
  const [state, action] = useActionState(createManualAanvraagAction, null);
  const submitting = useRef(false);

  useEffect(() => {
    if (state && "ok" in state && state.ok === false) submitting.current = false;
  }, [state]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
      }}
      className="relative space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6"
    >
      <Field id="company" label="Organisatie">
        <input id="company" name="company" required placeholder="Fluweel Events" className={fieldClass} />
      </Field>
      <Field id="name" label="Contact">
        <input id="name" name="name" required placeholder="Naam" autoComplete="name" className={fieldClass} />
      </Field>
      <Field id="email" label="E-mail">
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="info@bedrijf.nl" className={fieldClass} />
      </Field>
      <Field id="phone" label="Telefoon">
        <input id="phone" name="phone" inputMode="tel" autoComplete="tel" className={fieldClass} />
      </Field>
      <Field id="website" label="Website">
        <input id="website" name="website" inputMode="url" autoComplete="url" placeholder="https://bedrijf.nl" className={fieldClass} />
      </Field>
      <Field id="notes" label="Aanvraag / notitie">
        <textarea id="notes" name="notes" placeholder="Wat is er nodig?" className={areaClass} />
      </Field>
      <Field id="productFit" label="Product fit">
        <select id="productFit" name="productFit" defaultValue="REVIEW_REQUIRED" className={fieldClass}>
          {productFits.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="status" label="Status">
        <select id="status" name="status" defaultValue="NIEUW" className={fieldClass}>
          {aanvraagStatuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-ink/45">Bron wordt vastgelegd als MANUAL.</p>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <FormBusyOverlay label="Aanvraag opslaan…" />
      <SubmitButton
        pendingLabel="Opslaan…"
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory sm:w-auto"
      >
        Aanvraag opslaan
      </SubmitButton>
    </form>
  );
}
