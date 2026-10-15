"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitAanvraag } from "@/app/(marketing)/aanvraag/actions";
import { Field, areaClass, fieldClass } from "@/components/form-fields";
import { interestSubjects } from "@/lib/interest";
import { timingOptions } from "@/lib/site";

export type InterestFormValues = {
  source?: string;
  subject?: string;
  company?: string;
  website?: string;
  landing?: string;
  cta?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  submitLabel?: string;
};

export function InterestForm({
  source = "interesse",
  subject = "",
  company = "",
  website = "",
  landing = "",
  cta = "",
  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  submitLabel = "Verstuur je vraag",
}: InterestFormValues) {
  const [state, action, pending] = useActionState(submitAanvraag, null);
  const knownSubject = interestSubjects.some((item) => item.value === subject);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8" role="status">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 text-3xl text-ink">Vraag ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          We hebben je vraag ontvangen. Dit is geen opdracht. We nemen contact op via het opgegeven
          e-mailadres om de volgende stap te bespreken.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 bg-white p-6 md:p-8">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="Landing" value={landing} />
      <input type="hidden" name="CTA" value={cta} />
      <input type="hidden" name="utm_source" value={utmSource} />
      <input type="hidden" name="utm_medium" value={utmMedium} />
      <input type="hidden" name="utm_campaign" value={utmCampaign} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="name" label="Naam">
          <input id="name" name="name" required autoComplete="name" className={fieldClass} />
        </Field>
        <Field id="email" label="E-mail">
          <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </Field>
        <Field id="company" label="Bedrijfsnaam">
          <input
            id="company"
            name="company"
            required
            defaultValue={company}
            autoComplete="organization"
            className={fieldClass}
          />
        </Field>
        <Field id="phone" label="Telefoon (optioneel)">
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={fieldClass} />
        </Field>
      </div>

      <Field id="dienst" label="Onderwerp">
        <select id="dienst" name="Dienst" required defaultValue={knownSubject ? subject : ""} className={fieldClass}>
          <option value="" disabled>
            Kies een onderwerp
          </option>
          {interestSubjects.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="website" label="Website (optioneel)">
        <input
          id="website"
          name="website"
          defaultValue={website}
          placeholder="jouwbedrijf.nl"
          autoComplete="url"
          className={fieldClass}
        />
      </Field>

      <Field id="timing" label="Gewenste timing (optioneel)">
        <select id="timing" name="Timing" defaultValue="" className={fieldClass}>
          <option value="">Geen voorkeur</option>
          {timingOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="message" label="Korte toelichting">
        <textarea id="message" name="message" required className={areaClass} placeholder="Wat wil je bespreken?" />
      </Field>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Versturen…" : submitLabel}
      </button>
      <p className="text-xs leading-5 text-olive">
        We gebruiken deze gegevens alleen om je vraag te behandelen. Een aanvraag is geen toestemming voor
        marketingmail en geen opdracht.
      </p>
    </form>
  );
}
