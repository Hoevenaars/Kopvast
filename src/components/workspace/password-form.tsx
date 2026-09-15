"use client";

import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { saveAccountPassword, type PasswordState } from "@/app/(workspace)/inloggen/actions";
import { passwordHint } from "@/lib/password-rules";

const initial: PasswordState = null;

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(saveAccountPassword, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
      <div>
        <h2 className="font-semibold">{hasPassword ? "Wachtwoord wijzigen" : "Wachtwoord instellen"}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/45">
          {hasPassword
            ? "Na het opslaan blijven alleen deze sessie geldig."
            : "Stel een eigen wachtwoord in. Daarna kun je zonder mail inloggen."}
        </p>
      </div>
      {hasPassword ? (
        <Field id="currentPassword" label="Huidig wachtwoord">
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass}
          />
        </Field>
      ) : null}
      <Field id="password" label="Nieuw wachtwoord">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={fieldClass}
        />
      </Field>
      <Field id="confirm" label="Bevestig wachtwoord">
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={fieldClass}
        />
      </Field>
      <p className="text-xs leading-5 text-ink/45">{passwordHint}</p>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory disabled:opacity-60"
      >
        {pending ? "Opslaan…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
