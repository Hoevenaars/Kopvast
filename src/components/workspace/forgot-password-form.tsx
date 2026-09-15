"use client";

import { useActionState, useState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { requestReset, submitResetPassword, type LoginState } from "@/app/(workspace)/inloggen/actions";
import { passwordHint } from "@/lib/password-rules";

const initial: LoginState = null;

export function ForgotPasswordForm() {
  const [sendState, sendAction, sendPending] = useActionState(requestReset, initial);
  const [resetState, resetAction, resetPending] = useActionState(submitResetPassword, initial);
  const [email, setEmail] = useState("");
  if (sendState?.email && !email) setEmail(sendState.email);
  const showCode = Boolean(sendState?.needsCode);
  const devCode = sendState?.devCode;

  return (
    <div className="space-y-5">
      <form action={sendAction} className="space-y-5 rounded-2xl border border-stone/50 p-6">
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
        {sendState && !sendState.ok ? <p className="text-sm text-destructive">{sendState.message}</p> : null}
        {sendState?.ok ? (
          <p className="text-sm leading-6 text-olive">
            {sendState.emailed
              ? "Als dit adres toegang heeft, staat er een code in je mailbox."
              : "Voer de code hieronder in. Lokaal tonen we hem op dit scherm als er geen mail is verstuurd."}
          </p>
        ) : null}
        {devCode ? (
          <p className="rounded-md border border-stone/60 bg-ivory px-3 py-2 font-mono text-sm tracking-[0.2em] text-ink">
            {devCode}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={sendPending}
          className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
        >
          {sendPending ? "Even geduld…" : showCode ? "Stuur opnieuw" : "Stuur code"}
        </button>
      </form>

      {showCode ? (
        <form action={resetAction} className="space-y-5 rounded-2xl border border-stone/50 p-6">
          <input type="hidden" name="email" value={email} />
          <Field id="code" label="Code uit je e-mail">
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              placeholder="123 456"
              required
              className={fieldClass}
            />
          </Field>
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
          {resetState && !resetState.ok ? (
            <p className="text-sm text-destructive">{resetState.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={resetPending}
            className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
          >
            {resetPending ? "Opslaan…" : "Wachtwoord instellen"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
