import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { excludedWebsite, includedWebsite, products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Websites",
  description:
    "Kopvast Website: zes kernpagina's, een werkend aanvraagformulier en een vaste prijs. Daarna beheer zodat het goed geregeld blijft.",
};

const faqs = [
  {
    q: "Wat zit er in de € 1.495?",
    a: "Zes kernpagina’s, één taal, een standaardformulier, één correctieronde en een normale migratie. Privacy- en cookiepagina’s tellen niet als commerciële pagina, maar jij levert de juiste bedrijfsgegevens aan.",
  },
  {
    q: "Wat is een normale migratie?",
    a: "Eén domein, maximaal twintig expliciete redirects en geen herstel van verloren eigenaarschap of bestaande technische schade. Meer omvang beoordelen we vooraf en prijzen we apart of verwijzen we door.",
  },
  {
    q: "Moet ik ook beheer afnemen?",
    a: "Beheer is het logische vervolg vanaf livegang: hosting, controles, technisch beheer en twee kleine wijzigingen per maand. Het abonnement start op livegang, niet wanneer je een concept bekijkt. Maandelijks opzegbaar, met een opzegtermijn van een maand.",
  },
  {
    q: "Krijg ik automatisch meer klanten?",
    a: "Nee. We beloven een duidelijke website met werkende aanvraagroutes en meetbare inrichting. Geen gegarandeerde omzet, geen verzonnen groeipercentages.",
  },
];

export default function WebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Kopvast Website"
        title="Een sterke website. Goed geregeld."
        text="Je bedrijf is verder dan je website. Wij brengen die weer bij elkaar: zes kernpagina’s, een vaste prijs en een proces dat je niet in eindeloos overleg trekt."
      />

      <section className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-heading text-3xl text-ink md:text-4xl">Dit leveren we. Dit kost het.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-olive">
            De scherpe prijs komt uit standaardisatie, vaste productgrenzen en minder overdrachtsmomenten.
            Niet uit een goedkope uitstraling.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <PriceCard
              name={products.website.name}
              price={products.website.price}
              cadence={products.website.cadence}
              summary={products.website.summary}
            />
            <PriceCard
              name={products.beheer.name}
              price={products.beheer.price}
              cadence={products.beheer.cadence}
              summary={products.beheer.summary}
            />
          </div>
          <p className="mt-4 text-sm text-olive">
            Voorstel: 50% bij opdrachtbevestiging, 50% na goedkeuring en voor publicatie.
          </p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-6 md:p-8">
          <h3 className="font-heading text-2xl text-ink">Inbegrepen</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-olive">
            {includedWebsite.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <h3 className="mt-8 font-heading text-2xl text-ink">Niet inbegrepen</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-olive">
            {excludedWebsite.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl text-ink">Voor wie dit wel en niet is</h2>
            <p className="mt-4 text-base leading-7 text-olive">
              De eerste focus ligt op zelfstandige trouw- en eventlocaties met een eenvoudige
              presentatie- en aanvraagwebsite. Ook kleine advies- of trainingsbureaus kunnen passen,
              zolang de site terug te brengen is tot maximaal zes kernpagina’s.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Note title="Dit past" text="Een eigenaar kan beslissen, er is een concrete vernieuwingsbehoefte, en bestaande systemen zoals een externe boekingslink mogen blijven staan." />
            <Note title="Dit past niet" text="Webshops, uitgebreide portals, medische intake, complexe juridische of financiële dienstverlening, of sites waar maatwerk essentieel is." />
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="font-heading text-3xl text-ink">Veelgestelde vragen</h2>
        <Accordion className="mt-6 max-w-3xl border-t border-stone/50" defaultValue={[]}>
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-4 font-heading text-lg">{item.q}</AccordionTrigger>
              <AccordionContent className="text-olive">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-10">
          <ButtonLink href="/kansen">
            Bekijk je websitekansen
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

function PriceCard({
  name,
  price,
  cadence,
  summary,
}: {
  name: string;
  price: string;
  cadence: string;
  summary: string;
}) {
  return (
    <div className="rounded-2xl border border-stone/60 p-5">
      <p className="text-sm text-olive">{name}</p>
      <p className="mt-2 font-heading text-4xl text-ink">{price}</p>
      <p className="text-xs text-stone">{cadence}</p>
      <p className="mt-3 text-sm leading-6 text-olive">{summary}</p>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stone/50 p-5">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-olive">{text}</p>
    </div>
  );
}
