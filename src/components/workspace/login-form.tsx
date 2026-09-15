"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { requestLogin, type LoginState } from "@/app/(workspace)/inloggen/actions";
import { workspaceRoutes } from "@/lib/product";

const initial: LoginState = null;

export function LoginForm({ next, allowDev }: { next?: string; allowDev: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, initial);
  const [email, setEmail] = useState("");
  if (state?.email && !email) setEmail(state.email);
  const showCode = Boolean(state?.needsCode);
  const devCode = state?.devCode;

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {showCode ? <input type="hidden" name="awaitingCode" value="1" /> : null}
      <Field id="email" label="E-mailadres">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
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
      {showCode ? (
        <Field id="code" label="Code uit je e-mail">
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            placeholder="123 456"
            className={fieldClass}
          />
        </Field>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok && state.needsCode ? (
        <p className="text-sm leading-6 text-olive">
          {state.emailed
            ? "Als dit adres toegang heeft, staat er een code in je mailbox. Voer hem hieronder in."
            : "Voer de code hieronder in. Lokaal tonen we hem op dit scherm als er geen mail is verstuurd."}
        </p>
      ) : null}
      {allowDev && devCode ? (
        <p className="rounded-md border border-stone/60 bg-ivory px-3 py-2 font-mono text-sm tracking-[0.2em] text-ink">
          {devCode}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          value="code"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink disabled:opacity-60"
        >
          {pending ? "Even geduld…" : "Stuur code"}
        </button>
        {showCode ? (
          <button
            type="submit"
            name="intent"
            value="verify-code"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink disabled:opacity-60"
          >
            {pending ? "Even geduld…" : "Bevestig code"}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-olive">
        <Link className="underline underline-offset-4" href={workspaceRoutes.loginForgot}>
          Wachtwoord vergeten
        </Link>
      </p>
      {allowDev ? (
        <p className="text-xs leading-5 text-olive">
          Lokaal toont Kopvast de code op dit scherm als er geen mail wordt verstuurd. Live komt de
          code alleen in je mailbox.
        </p>
      ) : null}
    </form>
  );
}
