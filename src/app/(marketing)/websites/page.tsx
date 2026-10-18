import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { HostingOverview } from "@/components/hosting-overview";
import { PageHero } from "@/components/page-hero";
import { WebsitePackage } from "@/components/website-package";
import { LindenhofDesktop, LindenhofMobile } from "@/components/work/concept-mocks";
import { ConceptLabel } from "@/components/work/frames";
import { formatPrice, getProduct } from "@/lib/products";
import { cta, pageMeta, routes } from "@/lib/site";

const websitePrice = formatPrice(getProduct("website_standard")?.priceExVat);

export const metadata: Metadata = pageMeta(
  routes.websites,
  "Websites",
  "Een professionele website die vertrouwen wekt en contact eenvoudig maakt. Nieuwe sites, vernieuwing en maatwerk. De standaardprijs staat bij de scope."
);

const situations = [
  {
    title: "Eerste website",
    text: "Je hebt nog geen site, of alleen een vermelding ergens anders. Bezoekers zien in één oogopslag wie je bent, wat je doet en hoe ze contact opnemen.",
  },
  {
    title: "Website vernieuwen",
    text: "De site loopt achter op het bedrijf. We maken presentatie, pagina’s en de route naar een aanvraag weer kloppend, zonder het hele verhaal opnieuw te verzinnen.",
  },
  {
    title: "Maatwerkwebsite",
    text: `Meer dan zes pagina’s, een webshop, een boeking of een koppeling. Eerst de waarde van die extra stap, daarna een eigen voorstel naast de standaard van ${websitePrice}.`,
  },
];

const faqs = [
  {
    q: `Wat zit er in de ${websitePrice}?`,
    a: "Maximaal zes kernpagina’s, responsive ontwerp, één taal, een contactformulier, basis SEO, verwerking van bestaande content, één correctieronde, een reguliere migratie en een technische oplevercontrole.",
  },
  {
    q: "Is hosting inbegrepen?",
    a: "Nee. Hosting en beheer staan apart en starten alleen als ze in het voorstel staan. Een website aanvragen is geen abonnement.",
  },
  {
    q: "Wat als ik meer nodig heb?",
    a: "Dan maken we maatwerk. Extra pagina’s, een webshop, een reserveringssysteem, een klantomgeving of een koppeling vallen buiten de vaste prijs.",
  },
  {
    q: "Krijg ik automatisch meer klanten?",
    a: "Nee. Je krijgt een duidelijke website met een werkende contactroute. Geen omzetgarantie.",
  },
];

export default function WebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Websites"
        title="Een website die laat zien wat je bedrijf waard is."
        text="Een goede site maakt in een paar seconden duidelijk wie je bent, wat je doet en hoe iemand contact opneemt. Dat wekt vertrouwen. Kopvast bouwt die site, of vernieuwt de site die je al hebt."
        actions={
          <>
            <ButtonLink href={cta.website.href}>
              {cta.website.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
            <ButtonLink href={cta.websiteScope.href} variant="outline">
              {cta.websiteScope.label}
            </ButtonLink>
          </>
        }
      />

      <section className="container-page grid gap-8 py-16 md:grid-cols-3">
        {situations.map((item) => (
          <article key={item.title} className="border-t border-stone/50 pt-6">
            <h2 className="text-2xl text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="container-page pb-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <LindenhofDesktop />
          <div className="max-w-xs">
            <LindenhofMobile />
            <ConceptLabel className="mt-4" />
            <p className="mt-3 text-sm leading-6 text-olive">
              Conceptcase. Zo kan een locatie projecten, diensten en contact op één lijn zetten.
            </p>
          </div>
        </div>
      </section>

      <WebsitePackage />
      <HostingOverview />

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
      </section>

      <CtaBand
        title="Bespreek wat jouw website nodig heeft."
        primary={cta.website}
        secondary={cta.websiteScope}
      />
    </>
  );
}
