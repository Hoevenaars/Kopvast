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

const applications = [
  {
    title: "Procesautomatisering",
    text: "Terugkerende handelingen automatisch verwerken.",
  },
  {
    title: "Softwarekoppelingen",
    text: "Systemen laten samenwerken, zodat gegevens niet meerdere keren worden ingevoerd.",
  },
  {
    title: "Digitale assistenten",
    text: "AI die helpt bij structureren, verwerken, analyseren en voorbereiden.",
  },
  {
    title: "Slimmere klantprocessen",
    text: "Aanvragen, opvolging en informatieoverdracht efficiënter organiseren.",
  },
  {
    title: "Maatwerk",
    text: "Een specifieke oplossing wanneer bestaande software onvoldoende aansluit.",
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
        <h2 className="text-3xl text-ink">Wat Kopvast kan betekenen</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {applications.map((item) => (
            <article key={item.title} className="rounded-2xl border border-stone/50 p-6">
              <h3 className="text-xl text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl text-ink">Zo pakken we het aan</h2>
            <p className="mt-4 text-base leading-7 text-olive">
              Eerst het werk begrijpen. Daarna pas een oplossing. Geen belofte dat alles vanzelf door AI
              wordt gedaan.
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
        <h2 className="text-3xl text-ink">Geen vaste pakketprijs</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
          Automatisering beoordelen we per situatie. Er is geen automatische prijs, geen gegarandeerde
          besparing en geen belofte van een volledig autonome oplossing. Als het past, volgt een
          maatwerkvoorstel via dezelfde aanvraag.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-olive">
          De vier stappen van Kopvast blijven hetzelfde: {processSteps.map((step) => step.title.toLowerCase()).join(", ")}.
        </p>
      </section>

      <CtaBand title="Bespreek wat slimmer kan." primary={cta.automation} />
    </>
  );
}
