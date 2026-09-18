"use client";

import { useActionState, useState } from "react";
import { scoutLoginAction, type ScoutLoginState } from "@/app/(scout)/scout/actions";

export function ScoutLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(scoutLoginAction, null as ScoutLoginState);
  const [email, setEmail] = useState("");
  const showCode = Boolean(state?.needsCode);

  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {showCode ? <input type="hidden" name="awaitingCode" value="1" /> : null}
      <label className="block">
        <span className="text-xs tracking-[0.18em] text-olive uppercase">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none focus:ring-2 focus:ring-copper/40"
        />
      </label>
      <label className="block">
        <span className="text-xs tracking-[0.18em] text-olive uppercase">Wachtwoord</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none focus:ring-2 focus:ring-copper/40"
        />
      </label>
      {showCode ? (
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 tracking-[0.2em] outline-none focus:ring-2 focus:ring-copper/40"
          />
        </label>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.devCode ? (
        <p className="rounded-xl bg-white px-3 py-2 font-mono tracking-[0.18em]">{state.devCode}</p>
      ) : null}
      <button
        name="intent"
        value={showCode ? "verify-code" : "password"}
        disabled={pending}
        className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-ink text-sm tracking-[0.16em] text-ivory uppercase disabled:opacity-60"
      >
        {pending ? "Even…" : "Open Scout"}
      </button>
      <button
        name="intent"
        value="code"
        disabled={pending}
        className="w-full text-sm text-olive"
      >
        Stuur een code
      </button>
    </form>
  );
}
