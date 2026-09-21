"use client";

import { useActionState } from "react";
import { updateScoutCompanyAction, type ScoutCompanyState } from "@/app/(scout)/scout/actions";

export function ScoutCompanyNameForm({
  leadId,
  companyName,
}: {
  leadId: string;
  companyName: string | null;
}) {
  const [state, action, pending] = useActionState(updateScoutCompanyAction, null as ScoutCompanyState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block">
        <span className="text-xs tracking-[0.18em] text-olive uppercase">Bedrijfsnaam</span>
        <input
          name="company"
          required
          defaultValue={companyName ?? ""}
          autoComplete="organization"
          placeholder="Bouwkabouter"
          className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
        />
      </label>
      <p className="text-sm leading-6 text-olive">
        De scan pakt soms een paginatitel. Wijzigingen komen ook in Acquisitie en in het concept te staan.
      </p>
      {state && state.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-ink/15 bg-white text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Opslaan…" : "Naam opslaan"}
      </button>
    </form>
  );
}
