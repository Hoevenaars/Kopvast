import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AcquisitionStartBlock } from "@/components/acquisition-start-block";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { MaatwerkBlock } from "@/components/maatwerk-block";
import { PageHero } from "@/components/page-hero";
import { WebsitePackage } from "@/components/website-package";
import { LindenhofDesktop, LindenhofMobile, QuoteCard } from "@/components/work/concept-mocks";
import { ConceptLabel } from "@/components/work/frames";
import {
  commercialPriceLabel,
  formatPrice,
  getProduct,
  publicRecurringProducts,
  WEBSITE_LIST_PRICE_EX_VAT,
} from "@/lib/products";
import { cta, includedBeheer, includedHosting, products } from "@/lib/site";

const websitePrice = formatPrice(getProduct("website_standard")?.priceExVat);
const hostingProduct = getProduct("hosting");

export const metadata: Metadata = {
  title: "Websites",
  description: `Een sterke website vanaf ${websitePrice}. Maximaal zes kernpagina’s, vaste afspraken en ruimte voor maatwerk wanneer dat nodig is.`,
};

const faqs = [
  {
    q: `Wat zit er in de ${websitePrice}?`,
    a: "Maximaal zes kernpagina’s, responsive ontwerp, één taal, duidelijke navigatie, een contactformulier, basis SEO, verwerking van bestaande content, één correctieronde, een reguliere migratie en een technische oplevercontrole.",
  },
  {
    q: "Hoe is die prijs mogelijk?",
    a: "We werken met slimme automatisering, vaste bouwstenen en een strak proces. Daardoor betaal je niet voor onnodige projecturen.",
  },
  {
    q: "Wat als ik meer nodig heb?",
    a: "Dan maken we maatwerk. Grotere websites, webshops, reserveringssystemen, klantomgevingen of koppelingen vallen buiten de vaste pakketprijs.",
  },
  {
    q: "Moet ik ook beheer afnemen?",
    a: "Beheer is het logische vervolg vanaf livegang: hosting, onderhoud, controles en twee kleine wijzigingen per maand. Het start niet wanneer je een concept bekijkt. Maandelijks opzegbaar, met een opzegtermijn van een maand.",
  },
  {
    q: "Krijg ik automatisch meer klanten?",
    a: "Nee. We beloven een duidelijke website met werkende aanvraagroutes. Geen gegarandeerde omzet, geen verzonnen groeipercentages.",
  },
];

export default function WebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Websites"
        title="Een website op het niveau van je bedrijf."
        text="Professionele websites die vertrouwen wekken, duidelijk maken wat je doet en bezoekers gericht naar contact of aanvraag leiden."
        actions={
          <>
            <ButtonLink href={cta.start.href}>
              {cta.start.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
            <ButtonLink href={cta.custom.href} variant="outline">
              {cta.custom.label}
            </ButtonLink>
          </>
        }
      />

      <AcquisitionStartBlock
        params={{ choice: "info", website: "", company: "", offerPrice: WEBSITE_LIST_PRICE_EX_VAT }}
      />

      <section className="container-page py-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <LindenhofDesktop />
          <div className="max-w-xs">
            <LindenhofMobile />
            <ConceptLabel className="mt-4" />
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-3">
          <article>
            <h2 className="text-2xl text-ink">Een website die past bij jouw bedrijf</h2>
            <p className="mt-4 text-sm leading-6 text-olive">
              Van zelfstandig ondernemer tot gevestigde organisatie: Kopvast helpt je om professioneel en
              herkenbaar naar buiten te komen.
            </p>
            <p className="mt-3 text-sm leading-6 text-olive">
              Je branche bepaalt niet of je bij ons past. Wat je nodig hebt, bepaalt de aanpak.
            </p>
          </article>
          <article>
            <h2 className="text-2xl text-ink">Vaste basis</h2>
            <p className="mt-4 text-sm leading-6 text-olive">
              Ons websitepakket biedt een professionele website met maximaal zes kernpagina’s, een herkenbare
              uitstraling en duidelijke contactmogelijkheden. Met een heldere scope, vaste afspraken en een
              prijs die vooraf bekend is.
            </p>
          </article>
          <article>
            <h2 className="text-2xl text-ink">Meer nodig?</h2>
            <p className="mt-4 text-sm leading-6 text-olive">
              Een webshop, reserveringssysteem, klantomgeving of koppeling met andere software? Ook met
              uitgebreidere wensen kun je bij Kopvast terecht. We beoordelen wat nodig en haalbaar is en
              maken een afzonderlijk voorstel met een passende aanpak, planning en prijs.
            </p>
          </article>
        </div>
      </section>

      <WebsitePackage showStart />
      <MaatwerkBlock />

      <section className="border-y border-stone/40">
        <div className="container-page py-16">
          <p className="text-xs tracking-[0.18em] text-olive uppercase">Hosting</p>
          <h2 className="mt-3 text-3xl text-ink md:text-4xl">
            {hostingProduct?.name} — {commercialPriceLabel(hostingProduct!)}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-olive">{hostingProduct?.description}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {includedHosting.map((item) => (
              <li key={item} className="text-sm leading-6 text-olive">
                · {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {publicRecurringProducts().map((product) => (
              <article key={product.id} className="rounded-2xl border border-stone/50 p-5">
                <h3 className="text-lg text-ink">{product.name.replace("Kopvast ", "")}</h3>
                <p className="mt-3 font-heading text-3xl text-ink">
                  {product.priceType === "FROM" ? "v.a. " : ""}
                  {formatPrice(product.priceExVat)}
                </p>
                <p className="mt-1 text-xs text-stone">per maand excl. btw</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Managed dienst</p>
            <h2 className="mt-3 text-3xl text-ink md:text-4xl">{products.beheer.name}</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-olive">{products.beheer.summary}</p>
            <p className="mt-6 font-heading text-5xl text-ink">{products.beheer.price}</p>
            <p className="mt-1 text-xs text-stone">{products.beheer.cadence}</p>
          </div>
          <div className="rounded-2xl border border-stone/50 p-6 md:p-8">
            <h3 className="text-xl text-ink">Inbegrepen</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {includedBeheer.map((item) => (
                <li key={item} className="text-sm leading-6 text-olive">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-16 lg:grid-cols-[1fr_0.7fr] lg:items-center">
        <div>
          <h2 className="text-3xl text-ink">Zo ziet een standaardoplevering eruit</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-olive">
            Website, offerte en social in één lijn. Dit is een conceptcase, geen klantresultaat.
          </p>
        </div>
        <QuoteCard />
      </section>

      <section className="container-page py-16">
        <h2 className="text-3xl text-ink">Veelgestelde vragen</h2>
        <Accordion className="mt-6 max-w-3xl border-t border-stone/50" defaultValue={[]}>
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-4 text-lg">{item.q}</AccordionTrigger>
              <AccordionContent className="text-olive">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-10">
          <ButtonLink href={cta.start.href}>
            {cta.start.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
