"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyNameAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";

export function ProspectCompanyNameForm({
  prospectId,
  companyName,
}: {
  prospectId: string;
  companyName: string | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState(updateCompanyNameAction, null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) router.refresh();
  }, [router, state]);

  return (
    <form key={companyName ?? "empty"} action={action} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <FormBusyOverlay label="Naam opslaan…" />
      <input type="hidden" name="prospectId" value={prospectId} />
      <div>
        <h2 className="font-semibold">Bedrijfsnaam</h2>
        <p className="mt-1 text-sm text-ink/55">
          De scan pakt soms een paginatitel, zoals Klusbedrijf. Zet hier de echte naam. Die komt ook in Scout en in het
          concept te staan.
        </p>
      </div>
      <Field id="company" label="Naam">
        <input
          id="company"
          name="company"
          required
          defaultValue={companyName ?? ""}
          autoComplete="organization"
          placeholder="Bouwkabouter"
          className={fieldClass}
        />
      </Field>
      {state && "ok" in state && state.ok ? <p className="text-sm text-olive">Opgeslagen: {state.company}</p> : null}
      {state && "ok" in state && state.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <SubmitButton
        pendingLabel="Opslaan…"
        className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
      >
        Naam opslaan
      </SubmitButton>
    </form>
  );
}
