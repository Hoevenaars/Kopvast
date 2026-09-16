"use client";

import { useActionState } from "react";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import {
  submitConceptApproval,
  submitFinalApproval,
  submitProductionChange,
  type CustomerActionState,
} from "@/app/(workspace)/klant/goedkeuringen/actions";

const initial: CustomerActionState = null;

const buttonClass =
  "inline-flex h-11 items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60";

export function ConceptApprovalForm({ productionId, defaultName }: { productionId: string; defaultName: string }) {
  const [state, action, pending] = useActionState(submitConceptApproval, initial);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <input type="hidden" name="productionId" value={productionId} />
      <h3 className="text-base font-semibold">Akkoord met concept</h3>
      <p className="text-sm leading-6 text-ink/50">Je naam en e-mail worden bij het akkoord vastgelegd.</p>
      <Field id={`concept-name-${productionId}`} label="Naam">
        <input id={`concept-name-${productionId}`} name="name" required defaultValue={defaultName} className={fieldClass} />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">Akkoord op het concept is vastgelegd.</p> : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Vastleggen…" : "Akkoord met concept"}
      </button>
    </form>
  );
}

export function FinalApprovalForm({ productionId, defaultName }: { productionId: string; defaultName: string }) {
  const [state, action, pending] = useActionState(submitFinalApproval, initial);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <input type="hidden" name="productionId" value={productionId} />
      <h3 className="text-base font-semibold">Definitief akkoord</h3>
      <p className="text-sm leading-6 text-ink/50">
        Hiermee geef je Kopvast toestemming om live te gaan. We bewaren naam, e-mail en tijdstip.
      </p>
      <Field id={`final-name-${productionId}`} label="Naam">
        <input id={`final-name-${productionId}`} name="name" required defaultValue={defaultName} className={fieldClass} />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">Definitief akkoord is vastgelegd.</p> : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Vastleggen…" : "Definitief akkoord"}
      </button>
    </form>
  );
}

export function ProductionChangeForm({ productionId }: { productionId: string }) {
  const [state, action, pending] = useActionState(submitProductionChange, initial);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <input type="hidden" name="productionId" value={productionId} />
      <h3 className="text-base font-semibold">Wijzigingen doorgeven</h3>
      <Field id={`page-${productionId}`} label="Pagina / onderdeel">
        <input
          id={`page-${productionId}`}
          name="pageSection"
          required
          className={fieldClass}
          placeholder="Homepage, contact, footer"
        />
      </Field>
      <Field id={`body-${productionId}`} label="Wijziging">
        <textarea
          id={`body-${productionId}`}
          name="body"
          required
          className={areaClass}
          placeholder="Wat moet er anders, en waarom?"
        />
      </Field>
      <Field id={`file-${productionId}`} label="Bestand (optioneel, link)">
        <input id={`file-${productionId}`} name="fileUrl" type="url" className={fieldClass} placeholder="https://" />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">Wijziging is binnen. We werken hem af en sturen daarna opnieuw ter review.</p> : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Versturen…" : "Wijzigingen doorgeven"}
      </button>
    </form>
  );
}
