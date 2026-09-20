"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitAanvraag } from "@/app/(marketing)/aanvraag/actions";
import { Field, areaClass, fieldClass } from "@/components/form-fields";
import {
  acquisitionSource,
  formatOfferPrice,
  startConfirmLabel,
  type AcquisitionStartParams,
} from "@/lib/acquisition-start";
import { products } from "@/lib/site";

export function AcquisitionStartForm({
  choice,
  website,
  company,
  offerPrice,
}: AcquisitionStartParams) {
  const [state, action, pending] = useActionState(submitAanvraag, null);
  const [accepted, setAccepted] = useState(false);
  const price = formatOfferPrice(offerPrice);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 text-3xl text-ink">Aanvraag ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          {state.emailed
            ? `We zetten ${products.website.name} klaar voor ${price} excl. btw. Je hoort van ons op het opgegeven e-mailadres.`
            : `We zetten ${products.website.name} klaar voor ${price} excl. btw. We nemen contact met je op.`}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 bg-white p-6 md:p-8">
      <input type="hidden" name="source" value={acquisitionSource(choice)} />
      <input type="hidden" name="Keuze" value={choice === "info" ? "Meer info" : "Voorstel"} />
      <input type="hidden" name="Prijs" value={`${price} excl. btw`} />
      <input type="hidden" name="Pakket" value={products.website.name} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="company" label="Bedrijf">
          <input
            id="company"
            name="company"
            required
            defaultValue={company}
            autoComplete="organization"
            className={fieldClass}
          />
        </Field>
        <Field id="website" label="Huidige website">
          <input
            id="website"
            name="website"
            defaultValue={website}
            placeholder="jouwbedrijf.nl"
            className={fieldClass}
          />
        </Field>
        <Field id="name" label="Naam">
          <input id="name" name="name" required autoComplete="name" className={fieldClass} />
        </Field>
        <Field id="email" label="E-mail">
          <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </Field>
      </div>

      <Field id="phone" label="Telefoon (optioneel)">
        <input id="phone" name="phone" autoComplete="tel" className={fieldClass} />
      </Field>

      <Field id="message" label="Aanvulling (optioneel)">
        <textarea
          id="message"
          name="message"
          className={areaClass}
          placeholder="Pagina’s, planning of iets dat we moeten weten."
        />
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-stone/50 p-4 text-sm leading-6 text-ink">
        <input
          type="checkbox"
          name="Startbevestiging"
          value={startConfirmLabel(offerPrice)}
          required
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1"
        />
        <span>{startConfirmLabel(offerPrice)}</span>
      </label>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Versturen…" : "Start Kopvast Website"}
      </button>
      <p className="text-xs leading-5 text-olive">
        We gebruiken deze gegevens alleen om je aanvraag te behandelen. Geen nieuwsbrief, geen automatische
        marketing. Stilte is geen opdracht.
      </p>
    </form>
  );
}
