"use client";

import { useActionState, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { saveProposalAction } from "@/app/(workspace)/admin/aanvragen/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import type { ProposalLineRecord } from "@/lib/aanvragen-model";

type LineDraft = {
  key: string;
  title: string;
  description: string;
  amount_label: string;
  cadence: string;
};

export function ProposalEditor({
  proposalId,
  leadId,
  title,
  notes,
  lines,
  customFit,
}: {
  proposalId: string;
  leadId: string;
  title: string;
  notes: string;
  lines: ProposalLineRecord[];
  customFit: boolean;
}) {
  const [state, action] = useActionState(saveProposalAction, null);
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
  }, [state]);
  const [draftLines, setDraftLines] = useState<LineDraft[]>(
    lines.length
      ? lines.map((line) => ({
          key: line.id,
          title: line.title,
          description: line.description,
          amount_label: line.amount_label,
          cadence: line.cadence,
        }))
      : [emptyLine()]
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
      }}
      className="relative space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6"
    >
      <input type="hidden" name="id" value={proposalId} />
      <input type="hidden" name="leadId" value={leadId} />
      {customFit ? (
        <p className="rounded-md bg-ivory px-3 py-2 text-sm text-ink/65">
          Maatwerkvoorstel: geen vaste scope en geen €995. Voeg zelf regels en prijzen toe.
        </p>
      ) : (
        <p className="rounded-md bg-ivory px-3 py-2 text-sm text-ink/65">
          Standaardregels zijn voorgevuld. Controleer de prijs voordat je dit verstuurt.
        </p>
      )}
      <Field id="title" label="Titel">
        <input id="title" name="title" defaultValue={title} className={fieldClass} />
      </Field>
      <Field id="notes" label="Interne notitie">
        <textarea id="notes" name="notes" defaultValue={notes} className={areaClass} />
      </Field>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Regels</h2>
          <button
            type="button"
            onClick={() => setDraftLines((current) => [...current, emptyLine()])}
            className="text-sm font-medium underline underline-offset-4"
          >
            + Regel toevoegen
          </button>
        </div>
        {draftLines.map((line, index) => (
          <div key={line.key} className="space-y-3 rounded-xl border border-ink/8 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-wide text-ink/40 uppercase">Regel {index + 1}</p>
              {draftLines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setDraftLines((current) => current.filter((item) => item.key !== line.key))}
                  className="text-xs text-ink/45 underline underline-offset-4"
                >
                  Verwijderen
                </button>
              ) : null}
            </div>
            <input
              name="lineTitle"
              value={line.title}
              onChange={(event) => updateLine(setDraftLines, line.key, { title: event.target.value })}
              placeholder={customFit ? "Onderdeel" : "Kopvast Website"}
              className={fieldClass}
            />
            <textarea
              name="lineDescription"
              value={line.description}
              onChange={(event) => updateLine(setDraftLines, line.key, { description: event.target.value })}
              placeholder="Scope"
              className={areaClass}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="lineAmount"
                value={line.amount_label}
                onChange={(event) => updateLine(setDraftLines, line.key, { amount_label: event.target.value })}
                placeholder={customFit ? "Prijs, optioneel" : "€1.495"}
                className={fieldClass}
              />
              <input
                name="lineCadence"
                value={line.cadence}
                onChange={(event) => updateLine(setDraftLines, line.key, { cadence: event.target.value })}
                placeholder="eenmalig, excl. btw"
                className={fieldClass}
              />
            </div>
          </div>
        ))}
      </div>

      {state && "ok" in state && state.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state && "ok" in state && state.ok ? <p className="text-sm text-olive">Concept opgeslagen.</p> : null}
      <FormBusyOverlay label="Voorstel opslaan…" />
      <SubmitButton
        pendingLabel="Opslaan…"
        className="inline-flex h-12 cursor-pointer items-center justify-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
      >
        Concept opslaan
      </SubmitButton>
    </form>
  );
}

function emptyLine(): LineDraft {
  return { key: crypto.randomUUID(), title: "", description: "", amount_label: "", cadence: "" };
}

function updateLine(setDraftLines: Dispatch<SetStateAction<LineDraft[]>>, key: string, patch: Partial<LineDraft>) {
  setDraftLines((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
}
