"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmAcquisitionInterest } from "@/app/(marketing)/start/actions";
import { confirmedInterestCopy, type AcquisitionChoice } from "@/lib/acquisition-start";

export function AcquisitionConfirm({
  token,
  choice,
  company,
  hasWebsite,
  reason,
}: {
  token: string;
  choice: AcquisitionChoice;
  company: string;
  hasWebsite: boolean;
  reason: string;
}) {
  const [state, action, pending] = useActionState(confirmAcquisitionInterest, null);
  const copy = confirmedInterestCopy({ choice, hasWebsite, company });

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-stone/60 bg-[#f7f4ec] p-8" role="status">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 text-3xl text-ink">{state.already ? "We hadden je interesse al." : "Interesse bevestigd."}</h2>
        <p className="mt-3 text-sm leading-6 text-olive">{copy.step}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-stone/50 bg-white p-6 md:p-8">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm leading-6 text-olive">{reason}</p>
      <p className="text-sm leading-6 text-ink">{copy.step}</p>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Bevestigen…" : copy.confirm}
      </button>
    </form>
  );
}
