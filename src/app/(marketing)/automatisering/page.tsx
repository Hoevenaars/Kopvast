import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { cta, pageMeta, processSteps, routes } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  routes.automatisering,
  "Automatisering & AI",
  "Minder handmatig werk door praktische automatisering, slimme koppelingen en AI waar dat echt waarde toevoegt. Op maat, zonder vaste pakketprijs."
);

const situations = [
  {
    title: "Aanvragen komen binnen en worden handmatig overgezet",
    problem: "Een formulier, een mail of een appje belandt in een inbox. Iemand typt de gegevens daarna opnieuw over in de agenda, de administratie of een spreadsheet.",
    solution: "De aanvraag kan op één plek binnenkomen en de gegevens die je al hebt meteen op de juiste plek zetten.",
    meaning: "Minder overtikken, minder kans dat een aanvraag blijft liggen, en een snellere eerste reactie naar de klant.",
  },
  {
    title: "Verschillende systemen bevatten dezelfde gegevens",
    problem: "Naam, adres of opdracht staat in het ene systeem anders dan in het andere. Bij elke wijziging moet iemand onthouden waar die nog meer moet worden aangepast.",
    solution: "Een koppeling kan het bronsysteem leidend maken en de andere systemen bijwerken met dezelfde gegevens.",
    meaning: "Eén waarheid voor je klantgegevens, minder correctiewerk en minder kans dat een factuur of planning van een verouderd gegeven uitgaat.",
  },
  {
    title: "Terugkerende werkzaamheden kosten onnodig tijd",
    problem: "Elke week dezelfde stappen: een overzicht maken, een herinnering sturen, een map vullen of een status bijwerken.",
    solution: "Die vaste reeks kan een workflow worden die start zodra de aanleiding er is, met een menselijke controle op het moment dat een keuze nodig is.",
    meaning: "De uren gaan naar het werk dat echt aandacht vraagt. Wat zich herhaalt, loopt op de achtergrond mee.",
  },
];

const steps = [
  "Begrijpen waar tijd verloren gaat",
  "Het proces vereenvoudigen",
  "Een passende oplossing ontwerpen",
  "Klein beginnen en testen",
  "Waar waarde bewezen is, verder automatiseren",
];

export default function AutomationPage() {
  return (
    <>
      <PageHero
        eyebrow="Automatisering & AI"
        title="Minder handmatig werk. Meer ruimte om te ondernemen."
        text="Kopvast helpt bedrijven om terugkerende werkzaamheden slimmer te organiseren. Met praktische automatisering, slimme koppelingen en AI waar dat echt waarde toevoegt."
        actions={
          <ButtonLink href={cta.automation.href}>
            {cta.automation.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        }
      />

      <section className="container-page py-16">
        <h2 className="text-3xl text-ink">Drie situaties die we vaak tegenkomen</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-olive">
          Voorbeelden van hoe het werk kan lopen. Geen klantcases en geen belofte van een vaste besparing.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {situations.map((item) => (
            <article key={item.title} className="rounded-2xl border border-stone/50 p-6">
              <h3 className="text-xl text-ink">{item.title}</h3>
              <p className="mt-4 text-sm leading-6 text-olive">
                <span className="font-medium text-ink">Het probleem. </span>
                {item.problem}
              </p>
              <p className="mt-3 text-sm leading-6 text-olive">
                <span className="font-medium text-ink">Een mogelijke oplossing. </span>
                {item.solution}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink">
                <span className="font-medium">Wat dat kan betekenen. </span>
                {item.meaning}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl text-ink">Zo pakken we het aan</h2>
            <p className="mt-4 text-base leading-7 text-olive">
              Eerst het werk begrijpen. Daarna een oplossing die past bij die stappen, met een mens waar een keuze nodig blijft.
            </p>
          </div>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="text-sm tracking-[0.14em] text-copper uppercase">0{index + 1}</span>
                <span className="text-base text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-3xl text-ink">De prijs volgt uit de situatie</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
          Automatisering heeft geen vaste pakketprijs. We kijken naar het proces en zetten de prijs in het
          voorstel. Een besparing hangt af van hoe het werk nu loopt; die beloven we niet vooraf.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-olive">
          De vier stappen van Kopvast blijven hetzelfde: {processSteps.map((step) => step.title.toLowerCase()).join(", ")}.
        </p>
      </section>

      <CtaBand title="Bespreek wat slimmer kan." primary={cta.automation} />
    </>
  );
}
