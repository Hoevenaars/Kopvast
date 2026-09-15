"use client";

import { useActionState } from "react";
import { fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import {
  clearAcquisitionWorkspaceAction,
  setAcquisitionEmailModeAction,
  type AcquisitionOpsState,
} from "@/app/(workspace)/admin/instellingen/actions";
import {
  CLEAR_ACQUISITION_CONFIRM,
  LIVE_MODE_CONFIRM,
  TEST_MODE_CONFIRM,
} from "@/lib/acquisition-ops";
import type { EmailMode } from "@/lib/email-mode";

const initial: AcquisitionOpsState = null;

export function AcquisitionOpsForm({
  mode,
  storedMode,
  testTo,
}: {
  mode: EmailMode;
  storedMode: EmailMode | null;
  testTo: string;
}) {
  const liveStored = storedMode === "LIVE";
  const nextMode: EmailMode = liveStored ? "TEST" : "LIVE";
  const confirmWord = liveStored ? TEST_MODE_CONFIRM : LIVE_MODE_CONFIRM;
  const [modeState, modeAction] = useActionState(setAcquisitionEmailModeAction, initial);
  const [clearState, clearAction] = useActionState(clearAcquisitionWorkspaceAction, initial);

  return (
    <div className="space-y-5">
      <form action={modeAction} className="relative space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <FormBusyOverlay label="Modus opslaan…" />
        <div>
          <h2 className="font-semibold">Acquisitie</h2>
          <p className="mt-1 text-sm leading-6 text-ink/45">
            {liveStored
              ? `LIVE MODE staat aan. Versturen gaat naar het echte prospectadres. Testmail blijft intern (${testTo}).`
              : `TEST MODE staat aan. Versturen doorloopt de echte flow, maar Resend levert af op ${testTo}.`}
          </p>
          {mode !== (storedMode ?? "TEST") ? (
            <p className="mt-2 text-sm leading-6 text-ink/45">
              Deze omgeving is {mode}. De opgeslagen modus is {storedMode ?? "TEST"}.
            </p>
          ) : null}
        </div>
        <input type="hidden" name="mode" value={nextMode} />
        <Field id="modeConfirm" label={`Typ ${confirmWord} om ${nextMode} te zetten`}>
          <input id="modeConfirm" name="confirm" autoComplete="off" className={fieldClass} />
        </Field>
        {modeState && !modeState.ok ? <p className="text-sm text-destructive">{modeState.message}</p> : null}
        {modeState?.ok ? <p className="text-sm text-olive">{modeState.message}</p> : null}
        <SubmitButton
          pendingLabel="Opslaan…"
          className={
            liveStored
              ? "inline-flex h-11 items-center rounded-md border border-ink/15 px-5 text-sm font-semibold"
              : "inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
          }
        >
          {liveStored ? "Terug naar TEST" : "Start LIVE acquisitie"}
        </SubmitButton>
      </form>

      <form action={clearAction} className="relative space-y-5 rounded-2xl border border-copper/25 bg-[#F3E4DD] p-5 md:p-6">
        <FormBusyOverlay label="Omgeving leegmaken…" />
        <div>
          <h2 className="font-semibold text-copper-dark">Omgeving leeghalen</h2>
          <p className="mt-1 text-sm leading-6 text-copper-dark/80">
            Verwijdert prospects, scans, acquisitiemails en testaanvragen. Inloggen, mailtemplates en suppressions
            blijven staan.
          </p>
        </div>
        <Field id="clearConfirm" label={`Typ ${CLEAR_ACQUISITION_CONFIRM} om te bevestigen`}>
          <input id="clearConfirm" name="confirm" autoComplete="off" className={fieldClass} />
        </Field>
        {clearState && !clearState.ok ? <p className="text-sm text-destructive">{clearState.message}</p> : null}
        {clearState?.ok ? <p className="text-sm text-olive">{clearState.message}</p> : null}
        <SubmitButton
          pendingLabel="Leegmaken…"
          className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
        >
          Acquisitie-omgeving leegmaken
        </SubmitButton>
      </form>
    </div>
  );
}
