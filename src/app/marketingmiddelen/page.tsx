import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import {
  FlyerCard,
  PresentationCard,
  QuoteCard,
  SignatureCard,
  SocialCard,
} from "@/components/work/concept-mocks";
import { ConceptLabel } from "@/components/work/frames";
import { cta, products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Marketingmiddelen",
  description:
    "Van offertes en presentaties tot social formats, flyers en campagnes. Alles in één herkenbare lijn.",
};

export default function MarketingPage() {
  return (
    <>
      <PageHero
        eyebrow="Marketingmiddelen"
        title="Een merk is pas sterk als je het kunt gebruiken."
        text="Een goede huisstijl stopt niet bij je logo of website. Wij vertalen je merk door naar middelen die je dagelijks gebruikt."
        actions={
          <ButtonLink href={cta.templates.href}>
            {cta.templates.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        }
      />

      <section id="sjablonen" className="container-page scroll-mt-24 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-stone/60 p-6 md:p-8">
            <p className="text-xs tracking-[0.16em] text-olive uppercase">Zakelijke set</p>
            <h2 className="mt-3 text-3xl text-ink">Offerte, presentatie, handtekening</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-olive">
              <li>· Offerte</li>
              <li>· Presentatie</li>
              <li>· E-mailhandtekening</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-stone/60 p-6 md:p-8">
            <p className="text-xs tracking-[0.16em] text-olive uppercase">Zichtbaarheidsset</p>
            <h2 className="mt-3 text-3xl text-ink">Social, flyer, nieuwsbrief</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-olive">
              <li>· Social formats</li>
              <li>· Flyer</li>
              <li>· Nieuwsbriefopzet</li>
            </ul>
          </article>
        </div>
        <p className="mt-8 max-w-2xl text-base leading-7 text-olive">
          Alles wordt opgeleverd in een bewerkbare vorm, zodat je team de middelen ook echt kan gebruiken.
        </p>
        <p className="mt-3 text-sm text-olive">
          {products.sjablonen.name}: {products.sjablonen.price} {products.sjablonen.cadence}.
        </p>
        <div className="mt-8">
          <ButtonLink href={`${cta.custom.href}?type=sjablonen`}>
            {cta.templates.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page py-16">
          <ConceptLabel />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuoteCard />
            <PresentationCard />
            <SignatureCard />
            <SocialCard brand="Ardea" title="Eén lijn voor site, slide en handtekening." image="/images/evening.jpg" />
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h2 className="font-heading text-4xl leading-tight text-ink">Campagnes & marketingmiddelen</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-olive">
            Heb je een nieuwe vestiging, dienst, opening, actie of jubileum? Dan vertalen we dat moment door
            naar een samenhangende set middelen in je bestaande merkstijl.
          </p>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-olive">
            <li>· landingspagina</li>
            <li>· drie social varianten</li>
            <li>· nieuwsbrieftekst</li>
            <li>· digitale flyer</li>
          </ul>
          <div className="mt-8">
            <ButtonLink href={cta.campaign.href}>
              {cta.campaign.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
        <FlyerCard />
      </section>

      <CtaBand title="Eerst een lijn. Daarna middelen die je kunt gebruiken." />
    </>
  );
}
