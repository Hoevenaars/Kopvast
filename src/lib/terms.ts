import { products } from "@/lib/site";

export const VAT_RATE = 0.21;

export const proposalValidityDefault =
  "Dit voorstel is nog geen opdracht. Akkoord geldt alleen voor deze versie, tot we een nieuw voorstel sturen.";

export function termsSections() {
  return [
    {
      title: "Prijs en scope",
      body: `${products.website.name} kost ${products.website.price} eenmalig excl. btw en omvat maximaal zes kernpagina’s, één taal, een standaardformulier, één correctieronde en een reguliere migratie. ${products.beheer.name} kost ${products.beheer.price} per maand excl. btw vanaf livegang. Maatwerk valt buiten de vaste pakketprijs.`,
    },
    {
      title: "Betaling",
      body: "Voorstel: 50% bij opdrachtbevestiging en 50% na goedkeuring, voor publicatie. Een concept bekijken start het beheerabonnement niet.",
    },
    {
      title: "Akkoord en publicatie",
      body: "Stilte is geen publicatiegoedkeuring. Jij blijft domeinhouder. Bestaande e-mail (MX, SPF, DKIM, DMARC) wijzigen we niet zonder aparte goedkeuring.",
    },
    {
      title: "Opzegging van beheer",
      body: "Maandelijks opzegbaar, met een opzegtermijn van een maand. Bij vertrek ontvang je eigen content, rechtmatig overdraagbare assets, domeininformatie en een afgesproken export. De centrale editor en platformcode blijven van Kopvast.",
    },
  ] as const;
}

export function termsPlainText() {
  return termsSections()
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
}
