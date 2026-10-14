import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { cta, pageMeta, routes, site } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  routes.over,
  "Over Kopvast",
  "Kopvast bestaat om ondernemers en organisaties sterker zichtbaar te maken en slimmer te laten werken. Heldere afspraken, concrete uitvoering."
);

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Over Kopvast"
        title="Goed werk verdient een sterke plek online."
        text="Kopvast is er voor ondernemers en organisaties die professioneler zichtbaar willen zijn en hun werk slimmer willen organiseren."
      />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="max-w-xl space-y-4 text-base leading-7 text-olive">
          <p>
            Te vaak oogt een sterk bedrijf online zwakker dan het is. Of kost hetzelfde werk steeds opnieuw
            handmatige stappen. Daar begint Kopvast.
          </p>
          <p>
            Eerst scherp krijgen wat nodig is. Dan een richting en een voorstel. Dan ontwerp en realisatie.
            Daarna alleen de ondersteuning die is afgesproken.
          </p>
          <p>
            Websites zijn voorlopig de meest gekozen eerste stap. Van daaruit volgen merk, marketing,
            automatisering, hosting en beheer wanneer dat logisch is.
          </p>
          <p>{site.line}</p>
        </div>
        <div className="rounded-2xl border border-stone/50 p-6">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Contact</p>
          <p className="mt-3 text-lg text-ink">
            <a className="underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
          <p className="mt-4 text-sm leading-6 text-olive">
            Een bericht is een vraag, geen opdracht. Je krijgt een menselijke opvolging.
          </p>
          <div className="mt-6">
            <ButtonLink href={cta.discuss.href}>
              {cta.discuss.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-6 py-16 md:grid-cols-3">
          {[
            {
              title: "Scherp kijken",
              text: "We beginnen bij de vraag, niet bij een standaardtraject.",
            },
            {
              title: "Helder afspreken",
              text: "Scope en prijs staan in het voorstel. Niet in een verborgen stap.",
            },
            {
              title: "Goed uitvoeren",
              text: "Ontwerp, website, middelen of een koppeling. Concreet en bruikbaar.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl bg-ivory p-6">
              <h2 className="text-2xl text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
