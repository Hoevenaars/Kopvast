"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importProspectsAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { areaClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { workspaceRoutes } from "@/lib/product";

const PLACEHOLDER = `Pizzaria Leuth\tcemalcanbulat57@gmail.com
Henkbaron.nl
\tinfo@henkbaron.nl
floorpieper.nl\t0657596681`;

export function ImportProspectsForm() {
  const [state, action] = useActionState(importProspectsAction, null);

  return (
    <div className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">Lijst importeren</h2>
        <p className="mt-1 text-sm text-ink/60">
          Plak websites en e-mailadressen. Kopvast zet ze in de pipeline en scant ze op de achtergrond. Er gaat
          geen acquisitiemail automatisch de deur uit.
        </p>
      </div>
      <form action={action} className="relative space-y-5">
        <Field id="list" label="Websites">
          <textarea
            id="list"
            name="list"
            required
            placeholder={PLACEHOLDER}
            className={areaClass}
          />
        </Field>
        {state && "ok" in state && state.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <FormBusyOverlay label="Lijst importeren en scans starten…" />
        <SubmitButton
          pendingLabel="Lijst importeren…"
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md border border-ink/15 bg-white px-5 text-sm font-semibold sm:w-auto"
        >
          Lijst scannen
        </SubmitButton>
      </form>

      {state && state.ok ? (
        <div className="space-y-3 rounded-xl border border-copper/25 bg-ivory p-4 text-sm">
          <p className="font-medium">
            {state.created} nieuw, {state.skipped} bestonden al, {state.failed} mislukt
            {state.parseErrors.length ? `, ${state.parseErrors.length} regels overgeslagen` : ""}.
          </p>
          <ul className="space-y-2">
            {state.items.map((item) => (
              <li key={`${item.website}-${item.email ?? "geen"}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{item.company || item.website}</span>
                <span className="text-ink/45">{item.email || "geen e-mail"}</span>
                {item.ok ? (
                  <Link href={`${workspaceRoutes.adminAcquisition}/${item.prospectId}`} className="text-copper-dark underline">
                    Open
                  </Link>
                ) : (
                  <span className="text-destructive">
                    {item.message}
                    {item.existingId ? (
                      <>
                        {" "}
                        <Link
                          href={`${workspaceRoutes.adminAcquisition}/${item.existingId}`}
                          className="underline"
                        >
                          Open bestaande
                        </Link>
                      </>
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {state.parseErrors.length ? (
            <ul className="space-y-1 text-destructive">
              {state.parseErrors.map((error) => (
                <li key={error.line}>
                  {error.message}: {error.line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
