"use client";

import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { requestLogin, type LoginState } from "@/app/(workspace)/inloggen/actions";

const initial: LoginState = null;

export function LoginForm({ next, allowDev }: { next?: string; allowDev: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field id="email" label="E-mailadres">
        <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? (
        <p className="text-sm leading-6 text-olive">
          {state.emailed
            ? "Als dit adres toegang heeft, staat er een inloglink in je mailbox."
            : "Je bent ingelogd. We sturen je door."}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Even geduld…" : allowDev ? "Direct inloggen" : "Stuur inloglink"}
      </button>
      {allowDev ? (
        <p className="text-xs leading-5 text-olive">
          Lokale ontwikkeling logt meteen in. Live gaat dit via een mail van Kopvast.
        </p>
      ) : null}
    </form>
  );
}
