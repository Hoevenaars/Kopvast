"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { submitAanvraag } from "@/app/aanvraag/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full min-w-0 rounded-md border border-stone bg-ivory px-3 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

export function AanvraagForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(submitAanvraag, null);
  const website = params.get("website") ?? "";

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-muted/40 p-8">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 font-heading text-3xl text-ink">Aanvraag ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          We hebben je bericht opgeslagen. Je hoort van ons op het opgegeven e-mailadres. Stilte
          behandelen we niet als akkoord of opdracht.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="source" value={website ? "scan" : "aanvraag"} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Naam
          </label>
          <input id="name" name="name" required autoComplete="name" className={fieldClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            E-mail
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium text-ink">
            Bedrijf
          </label>
          <input id="company" name="company" autoComplete="organization" className={fieldClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="website" className="text-sm font-medium text-ink">
            Website
          </label>
          <input
            id="website"
            name="website"
            defaultValue={website}
            placeholder="jouwbedrijf.nl"
            autoComplete="url"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium text-ink">
          Wat speelt er?
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className="min-h-32 w-full rounded-md border border-stone bg-ivory px-3 py-2 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30"
          placeholder="Bijvoorbeeld: onze locatiewebsite is onduidelijk, aanvragen komen verspreid binnen, of de huisstijl klopt niet overal."
        />
      </div>
      <p className="text-sm leading-6 text-olive">
        We gebruiken deze gegevens alleen om je aanvraag te behandelen. Geen nieuwsbrief, geen
        automatische opvolging.
      </p>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "copper", size: "lg" }))}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Verstuur aanvraag
        <ArrowRight data-icon="inline-end" />
      </button>
    </form>
  );
}
