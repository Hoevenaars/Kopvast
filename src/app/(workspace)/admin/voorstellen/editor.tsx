"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveProposalAction, sendProposalAction } from "@/app/(workspace)/admin/voorstellen/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { workspaceRoutes } from "@/lib/product";
import {
  formatEuro,
  parseMoneyToCents,
  parseQuantity,
  proposalTypes,
  totalsFromLines,
  type ProposalLineRow,
  type ProposalRow,
  type ProposalVersionRow,
} from "@/lib/proposals";
import { proposalValidityDefault } from "@/lib/terms";

type EditorLine = {
  key: string;
  kind: "scope" | "recurring";
  title: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function toEditorLines(lines: ProposalLineRow[], kind: "scope" | "recurring"): EditorLine[] {
  const mapped = lines
    .filter((line) => line.kind === kind)
    .map((line) => ({
      key: line.id,
      kind,
      title: line.title,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: (line.unit_price_cents / 100).toString().replace(".", ","),
    }));
  return mapped.length ? mapped : [{ key: `${kind}-new`, kind, title: "", description: "", quantity: "1", unitPrice: "" }];
}

function parsedLines(lines: EditorLine[]) {
  return lines
    .map((line) => {
      const quantity = parseQuantity(line.quantity);
      const unitPriceCents = parseMoneyToCents(line.unitPrice || "0");
      if (!line.title.trim() || quantity == null || unitPriceCents == null) return null;
      return {
        kind: line.kind,
        title: line.title,
        description: line.description,
        quantity,
        unitPriceCents,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function ProposalEditor({
  proposal,
  lines,
  versions,
}: {
  proposal: ProposalRow;
  lines: ProposalLineRow[];
  versions: ProposalVersionRow[];
}) {
  const locked = proposal.status === "ACCEPTED";
  const [scopeLines, setScopeLines] = useState(() => toEditorLines(lines, "scope"));
  const [recurringLines, setRecurringLines] = useState(() =>
    lines.some((line) => line.kind === "recurring") ? toEditorLines(lines, "recurring") : []
  );
  const [saveState, saveAction] = useActionState(saveProposalAction, null);
  const [sendState, sendAction] = useActionState(sendProposalAction, null);
  const payload = useMemo(
    () => JSON.stringify([...parsedLines(scopeLines), ...parsedLines(recurringLines)]),
    [scopeLines, recurringLines]
  );
  const totals = totalsFromLines(parsedLines([...scopeLines, ...recurringLines]));
  const latest = versions[0] ?? null;
  const publicUrl = proposal.current_token ? `/voorstel/${proposal.current_token}` : null;
  const state = sendState ?? saveState;

  return (
    <form action={saveAction} className="relative space-y-8">
      <FormBusyOverlay label="Voorstel wordt opgeslagen…" />
      <input type="hidden" name="id" value={proposal.id} />
      <input type="hidden" name="lines" value={payload} />

      {state ? (
        <p className={state.ok ? "text-sm text-olive" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      {proposal.status !== "DRAFT" ? (
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-olive">
          Laatst verzonden als {proposal.number} v{latest?.version ?? proposal.version}. Wijzigingen gaan mee in de
          volgende versie.
        </p>
      ) : null}

      <section className="grid gap-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="recipient_organization" label="Organisatie">
            <input
              id="recipient_organization"
              name="recipient_organization"
              defaultValue={proposal.recipient_organization}
              className={fieldClass}
              disabled={locked}
              required
            />
          </Field>
          <Field id="type" label="Type">
            <select id="type" name="type" defaultValue={proposal.type} className={fieldClass} disabled={locked}>
              {proposalTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="recipient_name" label="Naam">
            <input id="recipient_name" name="recipient_name" defaultValue={proposal.recipient_name} className={fieldClass} disabled={locked} />
          </Field>
          <Field id="recipient_email" label="E-mail">
            <input
              id="recipient_email"
              name="recipient_email"
              type="email"
              defaultValue={proposal.recipient_email}
              className={fieldClass}
              disabled={locked}
              required
            />
          </Field>
        </div>
        <Field id="title" label="Titel">
          <input id="title" name="title" defaultValue={proposal.title} className={fieldClass} disabled={locked} />
        </Field>
        <Field id="intro" label="Intro">
          <textarea id="intro" name="intro" defaultValue={proposal.intro} className={areaClass} disabled={locked} />
        </Field>
        <Field id="aanleiding" label="Aanleiding">
          <textarea id="aanleiding" name="aanleiding" defaultValue={proposal.aanleiding} className={areaClass} disabled={locked} />
        </Field>
        <Field id="scope_summary" label="Wat maken we">
          <textarea id="scope_summary" name="scope_summary" defaultValue={proposal.scope_summary} className={areaClass} disabled={locked} />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Scope</h2>
          {locked ? null : (
            <button
              type="button"
              className="text-sm underline underline-offset-4"
              onClick={() =>
                setScopeLines((current) => [
                  ...current,
                  { key: crypto.randomUUID(), kind: "scope", title: "", description: "", quantity: "1", unitPrice: "" },
                ])
              }
            >
              Regel toevoegen
            </button>
          )}
        </div>
        <LineFields lines={scopeLines} onChange={setScopeLines} locked={locked} />
      </section>

      <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Beheer (optioneel)</h2>
          {locked ? null : (
            <button
              type="button"
              className="text-sm underline underline-offset-4"
              onClick={() =>
                setRecurringLines((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    kind: "recurring",
                    title: "Kopvast Beheer",
                    description: "",
                    quantity: "1",
                    unitPrice: "199",
                  },
                ])
              }
            >
              Beheerregel toevoegen
            </button>
          )}
        </div>
        {recurringLines.length ? <LineFields lines={recurringLines} onChange={setRecurringLines} locked={locked} /> : (
          <p className="text-sm text-olive">Geen maandelijks onderdeel. Voeg er een toe als beheer in het voorstel hoort.</p>
        )}
      </section>

      <section className="grid gap-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <Field id="planning" label="Planning">
          <textarea
            id="planning"
            name="planning"
            defaultValue={proposal.planning}
            placeholder="3–5 weken na ontvangst materialen."
            className={areaClass}
            disabled={locked}
          />
        </Field>
        <Field id="validity_text" label="Geldigheid">
          <textarea
            id="validity_text"
            name="validity_text"
            defaultValue={proposal.validity_text || proposalValidityDefault}
            className={areaClass}
            disabled={locked}
          />
        </Field>
        <p className="text-sm text-olive">Voorwaarden komen uit de bestaande werkwijze op /voorwaarden. Die tekst verzinnen we hier niet opnieuw.</p>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <h2 className="font-semibold">Prijs</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-olive">Subtotaal excl. btw</dt>
            <dd>{formatEuro(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-olive">Btw {Math.round(totals.vatRate * 100)}%</dt>
            <dd>{formatEuro(totals.vatCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <dt>Totaal incl. btw</dt>
            <dd>{formatEuro(totals.totalCents)}</dd>
          </div>
          {totals.recurringMonthlyCents > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-olive">Beheer per maand excl. btw</dt>
              <dd>{formatEuro(totals.recurringMonthlyCents)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {locked ? null : (
          <>
            <SubmitButton className="inline-flex h-11 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink" pendingLabel="Opslaan…">
              Opslaan
            </SubmitButton>
            <SubmitButton
              formAction={sendAction}
              className="inline-flex h-11 items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
              pendingLabel="Versturen…"
            >
              Versturen
            </SubmitButton>
          </>
        )}
        <Link
          href={`${workspaceRoutes.adminProposals}/${proposal.id}/preview`}
          className="inline-flex h-11 items-center justify-center rounded-md border border-stone px-5 text-sm text-ink"
        >
          Preview
        </Link>
        {publicUrl ? (
          <Link href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center px-2 text-sm underline underline-offset-4">
            Open klantlink
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function LineFields({
  lines,
  onChange,
  locked,
}: {
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
  locked: boolean;
}) {
  function patch(key: string, next: Partial<EditorLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...next } : line)));
  }
  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <div key={line.key} className="grid gap-3 rounded-xl border border-stone/50 p-4">
          <input
            value={line.title}
            onChange={(event) => patch(line.key, { title: event.target.value })}
            placeholder="Titel"
            className={fieldClass}
            disabled={locked}
          />
          <textarea
            value={line.description}
            onChange={(event) => patch(line.key, { description: event.target.value })}
            placeholder="Toelichting"
            className={areaClass}
            disabled={locked}
          />
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
            <input
              value={line.quantity}
              onChange={(event) => patch(line.key, { quantity: event.target.value })}
              placeholder="Aantal"
              className={fieldClass}
              disabled={locked}
            />
            <input
              value={line.unitPrice}
              onChange={(event) => patch(line.key, { unitPrice: event.target.value })}
              placeholder="Prijs excl. btw"
              className={fieldClass}
              disabled={locked}
            />
            {locked ? null : (
              <button
                type="button"
                className="text-sm text-olive underline underline-offset-4"
                onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
              >
                Verwijder
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
