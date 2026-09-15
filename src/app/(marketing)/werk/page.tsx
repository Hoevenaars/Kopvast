import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import {
  ArdeaDesktop,
  BrandRefreshCard,
  FlyerCard,
  LindenhofDesktop,
  LindenhofMobile,
  NoraDesktop,
  PresentationCard,
  QuoteCard,
  SignatureCard,
  SocialCard,
} from "@/components/work/concept-mocks";
import { ConceptLabel } from "@/components/work/frames";
import { conceptCases, cta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Werk",
  description:
    "Conceptcases van Kopvast. Geen verzonnen reviews of groeipercentages. Echte cases volgen na toestemming van klanten.",
};

export default function WerkPage() {
  return (
    <>
      <PageHero
        eyebrow="Werk"
        title="Eerst zichtbaar werk. Daarna echte cases."
        text="Tot er echte klanten en toestemming zijn, laten we zien hoe Kopvast werkt. Elk voorbeeld is duidelijk gelabeld als conceptcase. Geen verzonnen reviews of groeipercentages."
      />

      <section id="lindenhof" className="container-page scroll-mt-24 space-y-8 py-16">
        <CaseIntro caseIndex={0} />
        <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <LindenhofDesktop />
          <LindenhofMobile />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <BrandRefreshCard />
          <QuoteCard />
          <SocialCard brand="Lindenhof" title="Vraag een datum aan." image="/images/venue.jpg" />
        </div>
      </section>

      <section id="ardea" className="scroll-mt-24 border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page space-y-8 py-16">
          <CaseIntro caseIndex={1} />
          <ArdeaDesktop />
          <div className="grid gap-4 md:grid-cols-3">
            <PresentationCard />
            <SocialCard brand="Ardea" title="Advies dat je ook kunt laten zien." image="/images/evening.jpg" />
            <SignatureCard />
          </div>
        </div>
      </section>

      <section id="nora" className="container-page scroll-mt-24 space-y-8 py-16">
        <CaseIntro caseIndex={2} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <NoraDesktop />
          <div className="grid gap-4">
            <BrandRefreshCard />
            <FlyerCard />
            <SocialCard brand="NORA" title="Nieuwe lijn, dezelfde herkenning." image="/images/house.jpg" />
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <ButtonLink href={cta.check.href}>
          {cta.check.label}
          <ArrowRight data-icon="inline-end" />
        </ButtonLink>
      </section>
      <CtaBand />
    </>
  );
}

function CaseIntro({ caseIndex }: { caseIndex: number }) {
  const item = conceptCases[caseIndex];
  return (
    <div>
      <ConceptLabel />
      <p className="mt-3 text-xs tracking-[0.16em] text-olive uppercase">{item.sector}</p>
      <h2 className="mt-2 text-3xl text-ink md:text-4xl">{item.title}</h2>
      <dl className="mt-6 grid gap-4 text-sm leading-6 text-olive md:grid-cols-3">
        <div>
          <dt className="font-medium text-ink">Situatie</dt>
          <dd className="mt-1">{item.problem}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Aanpak</dt>
          <dd className="mt-1">{item.approach}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Opgeleverd</dt>
          <dd className="mt-1">{item.delivered.join(" · ")}</dd>
        </div>
      </dl>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-olive">{item.summary}</p>
    </div>
  );
}
