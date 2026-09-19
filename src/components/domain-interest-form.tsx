"use client";

import { useActionState, useState } from "react";
import { submitDomainInterest } from "@/app/(domain)/domein/actions";
import { Field, areaClass, fieldClass } from "@/components/form-fields";
import { buttonVariants } from "@/components/ui/button";
import { intentLabel, type DomainIntent } from "@/lib/domain-landing";
import { cn } from "@/lib/utils";

export function DomainInterestForm({ domain }: { domain: string | null }) {
  const [state, action, pending] = useActionState(submitDomainInterest, null);
  const [intent, setIntent] = useState<DomainIntent | null>(null);
  const [editableDomain, setEditableDomain] = useState(domain ?? "");

  if (state?.ok) {
    const shown = domain || editableDomain;
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8">
        <p className="text-xs tracking-[0.16em] text-olive uppercase">Bevestiging</p>
        <h2 className="mt-3 font-heading text-3xl text-ink">Bedankt</h2>
        <p className="mt-4 max-w-lg text-sm leading-6 text-olive">
          We hebben je aanvraag{shown ? ` voor ` : " ontvangen."}
          {shown ? <strong className="font-medium text-ink">{shown}</strong> : null}
          {shown ? " ontvangen." : null}
        </p>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">We nemen contact met je op.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setIntent("price")}
          className={cn(
            buttonVariants({ variant: intent === "price" ? "copper" : "outline", size: "lg" }),
            "h-12 w-full"
          )}
        >
          Prijs aanvragen
        </button>
        <button
          type="button"
          onClick={() => setIntent("bid")}
          className={cn(
            buttonVariants({ variant: intent === "bid" ? "copper" : "outline", size: "lg" }),
            "h-12 w-full"
          )}
        >
          Doe een bod
        </button>
      </div>

      {intent ? (
        <form action={action} className="space-y-5 rounded-2xl border border-stone/50 bg-ivory p-6 md:p-8">
          <input type="hidden" name="intent" value={intent} />
          {domain ? <input type="hidden" name="domain" value={domain} /> : null}

          <p className="text-sm text-olive">
            {intent === "bid"
              ? "Vul je gegevens in en geef aan wat je wilt bieden."
              : "Vul je gegevens in. We nemen vrijblijvend contact met je op over de prijs."}
          </p>

          <Field id="name" label="Naam">
            <input id="name" name="name" required autoComplete="name" className={fieldClass} />
          </Field>
          <Field id="email" label="E-mailadres">
            <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
          </Field>
          {domain ? (
            <Field id="domain-display" label="Domeinnaam">
              <input
                id="domain-display"
                value={domain}
                readOnly
                className={cn(fieldClass, "bg-[#f7f4ec] text-ink/80")}
              />
            </Field>
          ) : (
            <Field id="domain" label="Domeinnaam">
              <input
                id="domain"
                name="domain"
                required
                value={editableDomain}
                onChange={(event) => setEditableDomain(event.target.value)}
                placeholder="voorbeeld.nl"
                className={fieldClass}
              />
            </Field>
          )}

          {intent === "bid" ? (
            <Field id="bidAmount" label="Mijn bod">
              <div className="space-y-2">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-olive">
                    €
                  </span>
                  <input
                    id="bidAmount"
                    name="bidAmount"
                    inputMode="decimal"
                    placeholder="0"
                    className={cn(fieldClass, "pl-8")}
                  />
                </div>
                <p className="text-xs text-olive">Bedrag in euro. Je hoeft nog geen definitief bod te doen.</p>
              </div>
            </Field>
          ) : null}

          <Field id="message" label="Toelichting (optioneel)">
            <textarea id="message" name="message" className={areaClass} />
          </Field>

          <label className="flex items-start gap-3 text-sm leading-6 text-olive">
            <input
              type="checkbox"
              name="wantsWebsite"
              className="mt-1 size-4 shrink-0 rounded border-stone accent-copper-dark"
            />
            <span>Ik wil ook weten wat Kopvast voor de website kan betekenen</span>
          </label>

          {state && !state.ok ? <p className="text-sm text-[#9f2d1f]">{state.message}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ variant: "copper", size: "lg" }), "h-12 w-full sm:w-auto")}
          >
            {pending ? "Versturen…" : `Verstuur ${intentLabel(intent).toLowerCase()}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
