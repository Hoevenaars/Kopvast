import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Over Kopvast",
  description:
    "Kopvast helpt ondernemers hun bedrijf sterker te presenteren. Scherp denken. Sterk uitvoeren.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Over Kopvast"
        title="Scherp denken. Sterk uitvoeren."
        text="Kopvast is een zelfstandig label voor ondernemers die hun bedrijf sterker willen presenteren en ontwikkelen. De eerste verkoop is concreet: een professionele website."
      />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl text-ink">Een ondernemerspartner, geen bureau-theater</h2>
          <p className="mt-4 text-base leading-7 text-olive">
            Kopvast is een productgedreven merk: vaste pakketten, goedgekeurde componenten en
            menselijke verantwoordelijkheid waar het ertoe doet. Automatisering is het
            organisatiemodel, niet de klantbelofte.
          </p>
          <p className="mt-4 text-base leading-7 text-olive">
            Kopvast wordt geen recruitmentlabel, geen generiek AI-bureau en geen adviesfirma die
            ieder probleem aanneemt. Bedrijfsadvies komt er pas wanneer daar expertise, capaciteit
            en aantoonbare vraag voor is. Tot die tijd verkopen we het niet.
          </p>
          <p className="mt-4 text-base leading-7 text-olive">
            De merkervaring moet drie signalen geven: verzorgd genoeg voor een directietafel,
            toegankelijk genoeg voor een ondernemer, en praktisch genoeg om direct te bestellen.
          </p>
        </div>
        <div className="relative min-h-[22rem] overflow-hidden rounded-2xl">
          <Image src="/images/evening.jpg" alt="Rustige architectuur in avondlicht" fill className="object-cover" />
        </div>
      </section>
      <section className="border-y border-stone/40 bg-muted/40">
        <div className="container-page grid gap-6 py-16 md:grid-cols-3">
          {[
            {
              title: "Scherp",
              text: "We benoemen de echte opgave en onderbouwen bevindingen. Geen verkooppraat.",
            },
            {
              title: "Stevig",
              text: "Heldere scope, prijzen en verantwoordelijkheden. Geen eeuwige trajecten.",
            },
            {
              title: "Daadkrachtig",
              text: "We leveren, testen en regelen de overdracht. Elk advies krijgt een volgende stap.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl bg-ivory p-6">
              <h3 className="font-heading text-2xl text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
