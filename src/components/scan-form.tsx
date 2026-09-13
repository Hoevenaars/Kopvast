"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { runScan } from "@/app/websitecheck/actions";
import { ButtonLink } from "@/components/button-link";
import { buttonVariants } from "@/components/ui/button";
import { cta, products } from "@/lib/site";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-stone bg-ivory px-4 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

export function ScanForm({ compact = false }: { compact?: boolean }) {
  const [result, action, pending] = useActionState(runScan, null);

  return (
    <div className={compact ? "w-full" : "mx-auto max-w-2xl"}>
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
          {pending ? "Even kijken" : "Doe de websitecheck"}
          {pending ? null : <ArrowRight data-icon="inline-end" />}
        </button>
      </form>
      <p className="mt-3 text-sm text-olive">
        We kijken alleen naar de openbare homepage. Geen oordeel over je bedrijf, geen automatische
        opvolgmail.
      </p>

      {result?.status === "invalid" || result?.status === "blocked" ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-ivory p-5">
          <p className="font-medium text-ink">Dit adres kunnen we niet controleren</p>
          <p className="mt-2 text-sm leading-6 text-olive">{result.message}</p>
        </div>
      ) : null}

      {result?.status === "unreachable" ? (
        <div className="mt-8 rounded-xl border border-stone/70 bg-ivory p-5">
          <p className="font-medium text-ink">Deze website is nu niet bereikbaar</p>
          <p className="mt-2 text-sm leading-6 text-olive">{result.message}</p>
          <div className="mt-5">
            <ButtonLink href={cta.custom.href} variant="olive">
              Bespreek je vraag
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {result?.status === "ok" ? (
        <div className="mt-10 space-y-8">
          <div>
            <p className="text-xs tracking-[0.16em] text-stone uppercase">
              Aandachtspunten voor {result.url.replace(/^https?:\/\//, "")}
            </p>
            <h2 className="mt-2 text-3xl text-ink">Maximaal drie concrete punten</h2>
            <p className="mt-3 text-sm leading-6 text-olive">
              We scheiden feiten van observaties. Ontbrekende gegevens vullen we niet aan.
            </p>
          </div>

          {result.findings.length === 0 ? (
            <div className="rounded-xl border border-stone/70 bg-[#f7f4ec] p-5">
              <p className="font-medium text-ink">De basis ziet er verzorgd uit</p>
              <p className="mt-2 text-sm leading-6 text-olive">
                We vonden geen van de standaard zwakke plekken op de homepage. Dat zegt nog niet alles over
                merksamenhang of aanvraagkwaliteit. Daarvoor kijken we inhoudelijk verder.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {result.findings.map((finding, index) => (
                <li key={finding.id} className="rounded-xl border border-stone/60 bg-ivory p-5">
                  <p className="text-xs tracking-[0.14em] text-copper uppercase">
                    0{index + 1} · {finding.kind}
                  </p>
                  <h3 className="mt-2 text-2xl text-ink">{finding.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-olive">{finding.detail}</p>
                  <p className="mt-3 text-xs text-stone">{finding.evidence}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-2xl bg-ink p-6 text-ivory md:p-8">
            <p className="text-xs tracking-[0.16em] text-stone uppercase">Daarna</p>
            <h3 className="font-heading mt-2 text-3xl">Een vaste prijs. Een afgebakende website.</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ivory/75">
              We werken met vaste bouwstenen en een strak proces. Daardoor blijft de prijs scherp zonder dat
              de uitstraling goedkoop wordt.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm text-stone">{products.website.name}</p>
                <p className="mt-1 font-heading text-3xl">{products.website.price}</p>
                <p className="text-xs text-stone">{products.website.cadence}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm text-stone">{products.beheer.name}</p>
                <p className="mt-1 font-heading text-3xl">{products.beheer.price}</p>
                <p className="text-xs text-stone">{products.beheer.cadence}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`${cta.start.href}?website=${encodeURIComponent(result.url)}`}>
                {cta.start.label}
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <ButtonLink
                href={cta.custom.href}
                variant="outline"
                className="border-white/20 bg-transparent text-ivory hover:bg-white/10"
              >
                {cta.custom.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
