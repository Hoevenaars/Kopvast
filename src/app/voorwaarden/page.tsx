import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Voorwaarden",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Voorwaarden"
        title="Eerst de afspraken die we nu al hard maken."
        text="Algemene voorwaarden worden voor publieke verkoop door een jurist beoordeeld. Tot die tijd gelden onderstaande productgrenzen als werkwijze, niet als volledig contract."
      />
      <article className="container-page max-w-3xl space-y-8 py-16 text-sm leading-7 text-olive">
        <section>
          <h2 className="font-heading text-2xl text-ink">Prijs en scope</h2>
          <p className="mt-3">
            {products.website.name} kost {products.website.price} eenmalig excl. btw en omvat
            maximaal zes kernpagina’s, één taal, een standaardformulier, één correctieronde en een
            reguliere migratie. {products.beheer.name} kost {products.beheer.price} per maand excl.
            btw vanaf livegang. Maatwerk valt buiten de vaste pakketprijs.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Betaling</h2>
          <p className="mt-3">
            Voorstel: 50% bij opdrachtbevestiging en 50% na goedkeuring, voor publicatie. Een
            concept bekijken start het beheerabonnement niet.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Akkoord en publicatie</h2>
          <p className="mt-3">
            Stilte is geen publicatiegoedkeuring. Jij blijft domeinhouder. Bestaande e-mail (MX,
            SPF, DKIM, DMARC) wijzigen we niet zonder aparte goedkeuring.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Opzegging van beheer</h2>
          <p className="mt-3">
            Maandelijks opzegbaar, met een opzegtermijn van een maand. Bij vertrek ontvang je eigen
            content, rechtmatig overdraagbare assets, domeininformatie en een afgesproken export. De
            centrale editor en platformcode blijven van Kopvast.
          </p>
        </section>
      </article>
    </>
  );
}
