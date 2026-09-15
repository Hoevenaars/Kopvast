"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { requestLogin, type LoginState } from "@/app/(workspace)/inloggen/actions";
import { workspaceRoutes } from "@/lib/product";

const initial: LoginState = null;

export function LoginForm({ next, allowDev }: { next?: string; allowDev: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, initial);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field id="email" label="E-mailadres">
        <input id="email" name="email" type="email" required autoComplete="username" className={fieldClass} />
      </Field>
      <Field id="password" label="Wachtwoord">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={fieldClass}
        />
      </Field>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? (
        <p className="text-sm leading-6 text-olive">
          {state.emailed
            ? "Als dit adres toegang heeft, staat er een inloglink in je mailbox."
            : "Je bent ingelogd. We sturen je door."}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="password"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
        >
          {pending ? "Even geduld…" : "Inloggen"}
        </button>
        <button
          type="submit"
          name="intent"
          value="link"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink disabled:opacity-60"
        >
          Stuur inloglink
        </button>
      </div>
      <p className="text-sm text-olive">
        <Link className="underline underline-offset-4" href={workspaceRoutes.loginForgot}>
          Wachtwoord vergeten
        </Link>
      </p>
      {allowDev ? (
        <p className="text-xs leading-5 text-olive">
          Lokaal kun je via de inloglink direct binnenkomen tot er een wachtwoord is ingesteld. Live
          vereist een wachtwoord of een mail van Kopvast.
        </p>
      ) : null}
    </form>
  );
}
