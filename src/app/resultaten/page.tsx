import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Resultaten",
  description:
    "Conceptvoorbeelden van Kopvast. Geen verzonnen reviews of groeipercentages. Echte cases volgen na toestemming van betalende klanten.",
};

const concepts = [
  {
    image: "/images/venue.jpg",
    alt: "Landhuis aan het water",
    title: "Eventlocatie met een stille aanvraagroute",
    sector: "Trouw- en eventlocatie",
    problem:
      "De locatie is in het echt overtuigend, maar de website vertelt dat niet. Aanvragen komen via mail, telefoon en social door elkaar.",
    work: "Zes kernpagina’s, één duidelijke belofte, een standaard aanvraagformulier en behoud van een bestaande externe boekingslink.",
    result:
      "Bezoekers zien wat de plek waard is en hoe ze een datum kunnen voorleggen. Geen verzonnen stijging van boekingen.",
  },
  {
    image: "/images/house.jpg",
    alt: "Vrijstaand huis met veranda in het groen",
    sector: "Advies- en trainingsbureau",
    title: "Bureau dat expertiser dan de site oogt",
    problem:
      "Het werk is scherp, de middelen niet. Offerte, LinkedIn en website spreken drie talen.",
    work: "Websitevernieuwing plus een merkprofiel waarop sjablonen aansluiten. Bestaande herkenning blijft staan als de naam al vertrouwen heeft.",
    result:
      "Eén goedgekeurde basis voor site en documenten. Meetbare claims blijven achterwege tot er echte cijfers zijn.",
  },
];

export default function ResultsPage() {
  return (
    <>
      <PageHero
        eyebrow="Resultaten"
        title="Eerst eerlijke concepten. Daarna echte cases."
        text="Zonder bestaande klant krijgt een voorbeeld zichtbaar het label concept. Geen verzonnen reviews, teamleden, certificaten of groeipercentages."
      />
      <section className="container-page space-y-16 py-16">
        {concepts.map((item) => (
          <article key={item.title} className="grid overflow-hidden rounded-2xl border border-stone/50 lg:grid-cols-2">
            <div className="relative min-h-[18rem]">
              <Image src={item.image} alt={item.alt} fill className="object-cover" />
            </div>
            <div className="p-6 md:p-10">
              <Badge variant="outline">Concept</Badge>
              <p className="mt-4 text-xs tracking-[0.16em] text-olive uppercase">{item.sector}</p>
              <h2 className="mt-2 font-heading text-3xl text-ink">{item.title}</h2>
              <dl className="mt-6 space-y-4 text-sm leading-6 text-olive">
                <div>
                  <dt className="font-medium text-ink">Uitgangssituatie</dt>
                  <dd className="mt-1">{item.problem}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Werkzaamheden</dt>
                  <dd className="mt-1">{item.work}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Resultaat, begrensd</dt>
                  <dd className="mt-1">{item.result}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>
      <section className="container-page pb-16">
        <ButtonLink href="/kansen">
          Toets je eigen website
          <ArrowRight data-icon="inline-end" />
        </ButtonLink>
      </section>
      <CtaBand />
    </>
  );
}
