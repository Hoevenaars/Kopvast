import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Werkwijze",
  description:
    "Van intake tot beheer: Kopvast werkt in vaste stappen, met menselijke vrijgave op publicatie, merkwijzigingen en alles wat onomkeerbaar is.",
};

const steps = [
  { title: "Intake", text: "Scope, bevoegde contactpersoon, inhoud en toegangen zijn compleet. Geen productie met ontbrekende kritieke informatie." },
  { title: "Merkroute", text: "Behouden, refresh of een apart strategisch traject. Jij kiest bewust; geen verplichte herpositionering." },
  { title: "Merkprofiel", text: "De eerste inhoudelijke en visuele basis wordt goedgekeurd. Alle middelen gebruiken dezelfde versie." },
  { title: "Productie", text: "Website of middel samengesteld uit toegestane componenten. Geen willekeurige scripts per klant." },
  { title: "Kwaliteitscontrole", text: "Techniek, feiten, rechten en vormgeving. Een kritieke fout blokkeert oplevering." },
  { title: "Klantreview", text: "Eén gebundelde correctieronde, daarna expliciet akkoord. Stilte geldt niet als publicatiegoedkeuring." },
  { title: "Migratie", text: "Domein, bestaande e-mail, URL’s en terugvalplan. Onbekende impact betekent stoppen en uitzoeken." },
  { title: "Publicatie", text: "Goedgekeurde versie, betaling en testresultaten gekoppeld. Jij blijft domeinhouder." },
  { title: "Nazorg", text: "Hercontrole, formulierlevering en monitoring. Incidenten gaan naar een bevoegde beheerder." },
  { title: "Beheer", text: "Wijzigingen, technische zorg en een rustig overzicht. Uitbreiding heeft een aparte opdracht." },
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="Werkwijze"
        title="Van inzicht naar resultaat. Zonder eeuwig traject."
        text="Kopvast is vastberaden over het resultaat, maar niet star in de aanpak. Je ziet op elk moment wat klaar is, wat jij moet doen en wat meerwerk is."
      />
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {steps.map((step, index) => (
          <article key={step.title} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-stone/50 p-5">
            <span className="font-heading text-2xl text-copper">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-medium text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-olive">{step.text}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="relative min-h-[22rem] overflow-hidden">
        <Image src="/images/evening.jpg" alt="Verlichte woning in de avond, rustig en verzorgd" fill className="object-cover" />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative container-page flex min-h-[22rem] items-center py-16">
          <div className="max-w-xl text-ivory">
            <h2 className="font-heading text-3xl md:text-4xl">Wat wij nooit automatisch doen</h2>
            <p className="mt-4 text-sm leading-7 text-ivory/80">
              Geen publicatie zonder akkoord. Geen DNS-wijziging die je e-mail raakt. Geen koude
              acquisitiemail. Geen rebranding omdat een model daar zelfverzekerd over klinkt.
            </p>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
