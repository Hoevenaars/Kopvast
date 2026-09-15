"use client";

import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { submitResetPassword, type LoginState } from "@/app/(workspace)/inloggen/actions";
import { passwordHint } from "@/lib/password-rules";

const initial: LoginState = null;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitResetPassword, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      <input type="hidden" name="token" value={token} />
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
      <p className="text-xs leading-5 text-olive">{passwordHint}</p>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Opslaan…" : "Wachtwoord instellen"}
      </button>
    </form>
  );
}
