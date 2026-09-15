"use client";

import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { requestReset, type LoginState } from "@/app/(workspace)/inloggen/actions";

const initial: LoginState = null;

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestReset, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      <Field id="email" label="E-mailadres">
        <input id="email" name="email" type="email" required autoComplete="username" className={fieldClass} />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? (
        <p className="text-sm leading-6 text-olive">
          {state.emailed
            ? "Als dit adres toegang heeft, staat er een herstellink in je mailbox."
            : "Als dit adres toegang heeft, kun je nu een nieuw wachtwoord kiezen."}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Even geduld…" : "Stuur herstellink"}
      </button>
    </form>
  );
}
