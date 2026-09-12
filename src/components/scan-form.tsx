"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonLink } from "@/components/button-link";
import { products } from "@/lib/site";
import type { ScanResult } from "@/lib/scan";

export function ScanForm({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as ScanResult;
      setResult(data);
    } catch {
      setResult({
        status: "unreachable",
        message: "De controle kon nu niet worden uitgevoerd. Probeer het zo opnieuw.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-2xl"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="website-url">
          Websiteadres
        </label>
        <Input
          id="website-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="jouwbedrijf.nl"
          className="h-12 rounded-md border-stone bg-ivory px-4 text-base"
          inputMode="url"
          autoComplete="url"
          required
        />
        <Button type="submit" variant="copper" size="lg" disabled={loading} className="h-12 shrink-0">
          {loading ? <LoaderCircle className="animate-spin" /> : null}
          {loading ? "Bezig met kijken" : "Bekijk je websitekansen"}
          {loading ? null : <ArrowRight data-icon="inline-end" />}
        </Button>
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
            <p className="text-xs tracking-[0.16em] text-stone uppercase">Bevindingen voor {result.url.replace(/^https?:\/\//, "")}</p>
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
              <ButtonLink href="/resultaten" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10">
                Bekijk een conceptvoorbeeld
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
