"use client";

import { useActionState, useState } from "react";
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
  const hasWebsite = Boolean(existing.domain?.trim());
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
      <div className={`mt-5 grid gap-2 ${hasWebsite ? "grid-cols-2" : "grid-cols-1"}`}>
        <Link
          href={`${base}/leads/${existing.id}`}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-ink/15 text-sm font-medium"
        >
          Bekijk lead
        </Link>
        {hasWebsite ? (
          <form action={pushLeadFormAction}>
            <input type="hidden" name="website" value={existing.domain} />
            <input type="hidden" name="hasWebsite" value="ja" />
            <input type="hidden" name="rescanId" value={existing.id} />
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-ink text-sm font-medium text-ivory"
            >
              Nieuwe scan
            </button>
          </form>
        ) : null}
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
  const [hasWebsite, setHasWebsite] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [seen, setSeen] = useState<ScoutPushState>(null);
  const succeeded = Boolean(state && "ok" in state && state.ok);
  if (state !== seen) {
    setSeen(state);
    if (succeeded) {
      setWebsite("");
      setNote("");
      setDismissed(false);
    }
  }

  const success = succeeded && !dismissed;

  return (
    <div className="space-y-6">
      {success ? (
        <div className="rounded-3xl border border-olive/20 bg-white/70 px-5 py-4">
          <p className="text-lg tracking-[0.08em] text-ink">✓ Toegevoegd</p>
          <p className="mt-1 text-sm text-olive">
            {hasWebsite ? "Scan wordt uitgevoerd" : "Opgeslagen. Er is geen website en er start geen scan."}
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-4 text-sm font-medium tracking-[0.14em] text-copper-dark uppercase"
          >
            + Nieuwe lead
          </button>
        </div>
      ) : null}

      <ClipboardBanner
        onUse={(value) => {
          setWebsite(value);
          setDismissed(true);
        }}
      />

      <form action={action} className="space-y-5">
        <input type="hidden" name="source" value={initialSource || "scout_manual"} />
        <fieldset className="space-y-2">
          <legend className="text-xs tracking-[0.18em] text-olive uppercase">Website aanwezig</legend>
          <div className="mt-2 flex gap-3">
            <label className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white text-sm">
              <input type="radio" name="hasWebsite" value="ja" checked={hasWebsite} onChange={() => setHasWebsite(true)} />
              Ja
            </label>
            <label className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white text-sm">
              <input type="radio" name="hasWebsite" value="nee" checked={!hasWebsite} onChange={() => setHasWebsite(false)} />
              Nee
            </label>
          </div>
        </fieldset>
        {hasWebsite ? (
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
        ) : null}
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Bedrijfsnaam</span>
          <input
            name="company"
            required={!hasWebsite}
            placeholder={hasWebsite ? "Optioneel" : "Verplicht zonder website"}
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs tracking-[0.18em] text-olive uppercase">Voornaam</span>
            <input name="firstName" autoComplete="given-name" className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-xs tracking-[0.18em] text-olive uppercase">Achternaam</span>
            <input name="lastName" autoComplete="family-name" className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 focus:ring-2" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">E-mail</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            placeholder="Ook een Gmailadres is geldig"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Telefoon</span>
          <input
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Optioneel"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Facebook</span>
          <input
            name="facebookUrl"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Optioneel, dit is geen website"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Andere social URL</span>
          <input
            name="socialUrl"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Optioneel"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Vestigingsplaats</span>
          <input
            name="city"
            placeholder="Optioneel"
            className="mt-2 h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink outline-none ring-copper/40 placeholder:text-stone focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Bron-URL</span>
          <input
            name="sourceUrl"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Optioneel"
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
