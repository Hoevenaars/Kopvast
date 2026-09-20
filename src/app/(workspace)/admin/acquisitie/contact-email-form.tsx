"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateContactEmailAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { workspaceRoutes } from "@/lib/product";

export function ProspectContactEmailForm({
  prospectId,
  email,
  scanFailed,
}: {
  prospectId: string;
  email: string | null;
  scanFailed?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(updateContactEmailAction, null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) router.refresh();
  }, [router, state]);

  return (
    <form key={email ?? "empty"} action={action} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <FormBusyOverlay label="E-mail opslaan…" />
      <input type="hidden" name="prospectId" value={prospectId} />
      <div>
        <h2 className="font-semibold">E-mailadres</h2>
        <p className="mt-1 text-sm text-ink/55">
          {scanFailed && !email
            ? "De site was niet bereikbaar. Als je via Google een adres vond, zet die hier. Scout krijgt hem ook."
            : "Handmatig toevoegen of wijzigen. Scout krijgt dezelfde wijziging."}
        </p>
      </div>
      <Field id="email" label="E-mail">
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={email ?? ""}
          autoComplete="email"
          placeholder="info@bedrijf.nl"
          className={fieldClass}
        />
      </Field>
      {state && "ok" in state && state.ok ? (
        <p className="text-sm text-olive">Opgeslagen: {state.email}</p>
      ) : null}
      {state && "ok" in state && state.ok === false && "message" in state ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state && "emailConflict" in state && state.emailConflict ? (
        <p className="text-sm text-destructive">
          Dit e-mailadres hoort al bij{" "}
          <Link href={`${workspaceRoutes.adminAcquisition}/${state.existing.id}`} className="underline underline-offset-4">
            {state.existing.company_name || state.existing.domain}
          </Link>
          .
        </p>
      ) : null}
      <SubmitButton
        pendingLabel="Opslaan…"
        className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
      >
        {email ? "E-mail bijwerken" : "E-mail toevoegen"}
      </SubmitButton>
    </form>
  );
}
