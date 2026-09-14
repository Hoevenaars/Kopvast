"use client";

import { useActionState } from "react";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { submitRequest, type RequestState } from "@/app/(workspace)/console/verzoeken/actions";
import { requestTypes } from "@/lib/product";

const initial: RequestState = null;

export function RequestForm() {
  const [state, action, pending] = useActionState(submitRequest, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      <Field id="type" label="Soort">
        <select id="type" name="type" className={fieldClass}>
          {requestTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="title" label="Titel">
        <input id="title" name="title" required className={fieldClass} placeholder="Nieuw telefoonnummer op contact" />
      </Field>
      <Field id="body" label="Toelichting">
        <textarea id="body" name="body" required className={areaClass} placeholder="Wat moet er precies veranderen?" />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">Binnen. We pakken het op binnen het beheer.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Versturen…" : "Verstuur verzoek"}
      </button>
    </form>
  );
}
