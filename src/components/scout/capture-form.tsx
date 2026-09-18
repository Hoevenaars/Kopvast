"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { pushLeadAction, pushLeadFormAction, type ScoutPushState } from "@/app/(scout)/scout/actions";
import { ClipboardBanner } from "./clipboard-banner";

function DuplicateCard({
  base,
  existing,
}: {
  base: string;
  existing: { id: string; company_name: string | null; domain: string; status: string; score: number | null; last_scan_at: string | null };
}) {
  return (
    <div className="rounded-3xl border border-copper/30 bg-white/80 p-5 shadow-[0_10px_40px_rgba(18,18,18,0.06)]">
      <p className="text-xs tracking-[0.18em] text-copper-dark uppercase">Deze lead kennen we al</p>
      <h2 className="mt-2 text-xl text-ink">{existing.company_name || existing.domain}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-olive">
        <div>
          <dt className="text-[11px] tracking-[0.14em] uppercase">Status</dt>
          <dd className="mt-1 text-ink">{existing.status.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.14em] uppercase">Score</dt>
          <dd className="mt-1 text-ink">{existing.score ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] tracking-[0.14em] uppercase">Laatste scan</dt>
          <dd className="mt-1 text-ink">
            {existing.last_scan_at ? new Date(existing.last_scan_at).toLocaleString("nl-NL") : "Nog niet gescand"}
          </dd>
        </div>
      </dl>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          href={`${base}/leads/${existing.id}`}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-ink/15 text-sm font-medium"
        >
          Bekijk lead
        </Link>
        <form action={pushLeadFormAction}>
          <input type="hidden" name="website" value={existing.domain} />
          <input type="hidden" name="rescanId" value={existing.id} />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-ink text-sm font-medium text-ivory"
          >
            Nieuwe scan
          </button>
        </form>
      </div>
    </div>
  );
}

export function ScoutCaptureForm({
  base,
  initialUrl,
  initialSource,
  initialNote,
}: {
  base: string;
  initialUrl?: string;
  initialSource?: string;
  initialNote?: string;
}) {
  const [state, action, pending] = useActionState(pushLeadAction, null as ScoutPushState);
  const [website, setWebsite] = useState(initialUrl ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setWebsite("");
      setNote("");
      setDone(true);
    }
  }, [state]);

  const success = useMemo(() => done && state && "ok" in state && state.ok, [done, state]);

  return (
    <div className="space-y-6">
      {success ? (
        <div className="rounded-3xl border border-olive/20 bg-white/70 px-5 py-4">
          <p className="text-lg tracking-[0.08em] text-ink">✓ Toegevoegd</p>
          <p className="mt-1 text-sm text-olive">Scan wordt uitgevoerd</p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mt-4 text-sm font-medium tracking-[0.14em] text-copper-dark uppercase"
          >
            + Nieuwe lead
          </button>
        </div>
      ) : null}

      <ClipboardBanner
        onUse={(value) => {
          setWebsite(value);
          setDone(false);
        }}
      />

      <form action={action} className="space-y-5">
        <input type="hidden" name="source" value={initialSource || "scout_manual"} />
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Website</span>
          <input
            name="website"
            required
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="url"
            placeholder="https://"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Opmerking</span>
          <textarea
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Optioneel…"
            enterKeyHint="done"
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        {state && "ok" in state && state.ok === false && "message" in state ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-16 w-full items-center justify-center rounded-2xl bg-copper-dark text-[15px] font-semibold tracking-[0.16em] text-ivory uppercase disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Push naar acquisitie →"}
        </button>
      </form>

      {state && "duplicate" in state && state.duplicate ? <DuplicateCard base={base} existing={state.existing} /> : null}

      <div className="flex gap-3 pt-2 text-sm text-olive">
        <Link href={`${base}/camera`} className="underline-offset-4 hover:underline">
          Maak foto
        </Link>
        <span aria-hidden>·</span>
        <Link href={`${base}/nearby`} className="underline-offset-4 hover:underline">
          Hier in de buurt
        </Link>
        <span aria-hidden>·</span>
        <Link href={`${base}/shortcut`} className="underline-offset-4 hover:underline">
          iPhone-shortcut
        </Link>
      </div>
    </div>
  );
}
