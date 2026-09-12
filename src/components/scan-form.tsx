"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { runScan } from "@/app/kansen/actions";
import { ButtonLink } from "@/components/button-link";
import { buttonVariants } from "@/components/ui/button";
import { products } from "@/lib/site";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-stone bg-ivory px-4 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

export function ScanForm() {
  const [result, action, pending] = useActionState(runScan, null);

  return (
    <div className="mx-auto max-w-2xl">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="website-url">
          Websiteadres
        </label>
        <input
          id="website-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          placeholder="jouwbedrijf.nl"
          className={fieldClass}
          defaultValue={result && "url" in result ? result.url.replace(/^https?:\/\//, "") : ""}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ variant: "copper", size: "lg" }), "h-12 shrink-0")}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Bezig met kijken" : "Bekijk je websitekansen"}
          {pending ? null : <ArrowRight data-icon="inline-end" />}
        </button>
      </form>
      <p className="mt-3 text-sm text-olive">
        We halen alleen de openbare homepage op. Geen tracking, geen koude opvolgmail.
      </p>

      {result?.status === "invalid" || result?.status === "blocked" ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-ivory p-5">
          <p className="font-medium text-ink">Dit adres kunnen we niet controleren</p>
          <p className="mt-2 text-sm leading-6 text-olive">{result.message}</p>
        </div>
      ) : null}

      {result?.status === "unreachable" ? (
        <div className="mt-8 rounded-xl border border-stone/70 bg-ivory p-5">
          <p className="font-medium text-ink">Technische status: niet bereikbaar</p>
          <p className="mt-2 text-sm leading-6 text-olive">{result.message}</p>
          <p className="mt-4 text-sm text-olive">
            Wil je toch een gesprek over de website? Stuur dan een aanvraag. We beoordelen handmatig.
          </p>
          <div className="mt-5">
            <ButtonLink href="/aanvraag" variant="olive">
              Stuur een aanvraag
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {result?.status === "ok" ? (
        <div className="mt-10 space-y-8">
          <div>
            <p className="text-xs tracking-[0.16em] text-stone uppercase">
              Bevindingen voor {result.url.replace(/^https?:\/\//, "")}
            </p>
            <h2 className="mt-2 font-heading text-3xl text-ink">Maximaal drie concrete punten</h2>
            <p className="mt-3 text-sm leading-6 text-olive">
              We scheiden feiten van observaties. Ontbrekende gegevens vullen we niet aan met aannames.
              Dekking van deze check: {result.coverage.join(", ").toLowerCase()}.
            </p>
          </div>

          {result.findings.length === 0 ? (
            <div className="rounded-xl border border-stone/70 bg-muted/40 p-5">
              <p className="font-medium text-ink">De basis ziet er verzorgd uit</p>
              <p className="mt-2 text-sm leading-6 text-olive">
                We vonden geen van de standaard zwakke plekken op de homepage. Dat zegt nog niet alles over
                merksamenhang, aanvraagkwaliteit of beheer. Daarvoor kijken we inhoudelijk verder.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {result.findings.map((finding, index) => (
                <li key={finding.id} className="rounded-xl border border-stone/60 bg-ivory p-5">
                  <p className="text-xs tracking-[0.14em] text-copper uppercase">
                    0{index + 1} · {finding.kind}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl text-ink">{finding.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-olive">{finding.detail}</p>
                  <p className="mt-3 text-xs text-stone">{finding.evidence}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-2xl bg-ink p-6 text-ivory md:p-8">
            <p className="text-xs tracking-[0.16em] text-stone uppercase">Wat je daarna krijgt</p>
            <h3 className="mt-2 font-heading text-3xl">Een vaste prijs. Een afgebakende website.</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ivory/75">
              Kopvast werkt gestandaardiseerd: vaste componenten, duidelijke scope en weinig onnodig overleg.
              Daardoor blijft de prijs scherp zonder dat de uitstraling goedkoop wordt.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm text-stone">{products.website.name}</p>
                <p className="mt-1 font-heading text-3xl">{products.website.price}</p>
                <p className="text-xs text-stone">{products.website.cadence}</p>
                <p className="mt-3 text-sm leading-6 text-ivory/75">{products.website.summary}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm text-stone">{products.beheer.name}</p>
                <p className="mt-1 font-heading text-3xl">{products.beheer.price}</p>
                <p className="text-xs text-stone">{products.beheer.cadence}</p>
                <p className="mt-3 text-sm leading-6 text-ivory/75">{products.beheer.summary}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/aanvraag?website=${encodeURIComponent(result.url)}`}>
                Vraag dit pakket aan
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <ButtonLink
                href="/resultaten"
                variant="outline"
                className="border-white/20 bg-transparent text-ivory hover:bg-white/10"
              >
                Bekijk een conceptvoorbeeld
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
