"use client";

import { useActionState, useState } from "react";
import { acceptProposalAction, askQuestionAction } from "@/app/(proposal)/voorstel/[token]/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { formatEuro } from "@/lib/proposals";

export function ProposalResponse({
  token,
  organization,
  number,
  amountCents,
  name,
  email,
  accepted,
  current,
}: {
  token: string;
  organization: string;
  number: string;
  amountCents: number;
  name: string;
  email: string;
  accepted: boolean;
  current: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "accept" | "question">(accepted ? "idle" : "idle");
  const [acceptState, acceptAction] = useActionState(acceptProposalAction, null);
  const [questionState, questionAction] = useActionState(askQuestionAction, null);
  const state = acceptState ?? questionState;

  if (!current) {
    return (
      <p className="rounded-2xl border border-stone/60 bg-white p-5 text-sm text-olive">
        Dit is een eerdere versie. Alleen het actuele voorstel kan worden geaccepteerd. Vraag Kopvast om de laatste link.
      </p>
    );
  }

  if (accepted || acceptState?.ok) {
    return (
      <p className="rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink">
        {acceptState?.message || "Akkoord ontvangen. We zetten de volgende stap in gang."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {state ? <p className={state.ok ? "text-sm text-olive" : "text-sm text-destructive"}>{state.message}</p> : null}
      {questionState?.ok ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink">{questionState.message}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setMode("accept")}
              className="inline-flex h-12 items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
            >
              Akkoord, laten we starten
            </button>
            <button
              type="button"
              onClick={() => setMode("question")}
              className="inline-flex h-12 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink"
            >
              Ik heb nog een vraag
            </button>
          </div>

          {mode === "accept" ? (
            <form action={acceptAction} className="relative space-y-4 rounded-2xl border border-stone/60 bg-white p-5">
              <FormBusyOverlay />
              <input type="hidden" name="token" value={token} />
              <p className="text-sm text-olive">
                {organization} · {number} · {formatEuro(amountCents)} excl. btw
              </p>
              <Field id="name" label="Naam">
                <input id="name" name="name" defaultValue={name} required className={fieldClass} />
              </Field>
              <Field id="email" label="E-mail">
                <input id="email" name="email" type="email" defaultValue={email} required className={fieldClass} />
              </Field>
              <label className="flex items-start gap-3 text-sm leading-6 text-olive">
                <input type="checkbox" name="accepted_terms" className="mt-1" required />
                Ik ga akkoord met de voorwaarden van dit voorstel.
              </label>
              <SubmitButton className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory">
                Bevestig akkoord
              </SubmitButton>
            </form>
          ) : null}

          {mode === "question" ? (
            <form action={questionAction} className="relative space-y-4 rounded-2xl border border-stone/60 bg-white p-5">
              <FormBusyOverlay />
              <input type="hidden" name="token" value={token} />
              <Field id="question" label="Je vraag">
                <textarea id="question" name="question" required minLength={8} className={areaClass} />
              </Field>
              <p className="text-xs text-olive">We koppelen dit aan {email}.</p>
              <SubmitButton className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm text-ivory">
                Verstuur vraag
              </SubmitButton>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
