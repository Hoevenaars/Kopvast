"use client";

import { useActionState } from "react";
import { updateScoutEmailAction, type ScoutEmailState } from "@/app/(scout)/scout/actions";

export function ScoutContactEmailForm({
  leadId,
  email,
  scanFailed,
}: {
  leadId: string;
  email: string | null;
  scanFailed?: boolean;
}) {
  const [state, action, pending] = useActionState(updateScoutEmailAction, null as ScoutEmailState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block">
        <span className="text-xs tracking-[0.18em] text-olive uppercase">E-mail</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={email ?? ""}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          placeholder="info@bedrijf.nl"
          className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
        />
      </label>
      {scanFailed && !email ? (
        <p className="text-sm leading-6 text-olive">
          De site was niet bereikbaar. Als je via Google een e-mailadres vond, voeg die hier toe. Die komt ook in
          Kopvast te staan.
        </p>
      ) : (
        <p className="text-sm leading-6 text-olive">Wijzigingen komen ook in Acquisitie te staan.</p>
      )}
      {state && state.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-ink/15 bg-white text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Opslaan…" : email ? "E-mail bijwerken" : "E-mail toevoegen"}
      </button>
    </form>
  );
}
