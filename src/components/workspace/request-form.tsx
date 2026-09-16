"use client";

import { useActionState } from "react";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { submitRequest, type RequestState } from "@/app/(workspace)/klant/wijzigingen/actions";
import { customerRequestTypes } from "@/lib/product";

const initial: RequestState = null;

export function RequestForm({
  websites,
  source = "wijziging",
  showFile = false,
  defaultType,
}: {
  websites?: Array<{ id: string; label: string }>;
  source?: "wijziging" | "support";
  showFile?: boolean;
  defaultType?: string;
}) {
  const [state, action, pending] = useActionState(submitRequest, initial);
  const isSupport = source === "support";

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      <input type="hidden" name="source" value={source} />
      {isSupport ? <input type="hidden" name="type" value={defaultType ?? "vraag"} /> : null}
      {websites && websites.length > 0 ? (
        <Field id="projectId" label="Website">
          <select id="projectId" name="projectId" className={fieldClass} defaultValue={websites[0]?.id}>
            {websites.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {isSupport ? null : (
        <Field id="type" label="Soort">
          <select id="type" name="type" className={fieldClass} defaultValue={defaultType ?? "wijziging"}>
            {customerRequestTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field id="title" label={isSupport ? "Onderwerp" : "Titel"}>
        <input
          id="title"
          name="title"
          required
          className={fieldClass}
          placeholder={isSupport ? "Waar kunnen we mee helpen?" : "Nieuw telefoonnummer op contact"}
        />
      </Field>
      <Field id="body" label="Bericht">
        <textarea
          id="body"
          name="body"
          required
          className={areaClass}
          placeholder={isSupport ? "Beschrijf je vraag of wijziging." : "Wat moet er precies veranderen?"}
        />
      </Field>
      {showFile ? (
        <Field id="file" label="Bestand (optioneel)">
          <input id="file" name="file" type="file" className={fieldClass} />
        </Field>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">Binnen. We pakken het op binnen het beheer.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Versturen…" : isSupport ? "Verstuur verzoek" : "Verstuur verzoek"}
      </button>
    </form>
  );
}
