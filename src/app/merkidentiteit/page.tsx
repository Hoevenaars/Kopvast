import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Merkidentiteit",
  description:
    "Kopvast houdt een goede huisstijl in stand, scherpt bestaande herkenning aan, of verwijst door als een nieuwe positionering nodig is.",
};

const routes = [
  {
    title: "Behouden",
    text: "Een goede bestaande huisstijl blijft staan. De website wordt professioneel zonder dat je een nieuwe merkdiscussie koopt.",
  },
  {
    title: "Opfrissen",
    text: `${products.merkrefresh.name} voor ${products.merkrefresh.price}: kleur, typografie, beeldrichting, schrijfstijl en een compacte merkset, met behoud van herkenning.`,
  },
  {
    title: "Opnieuw positioneren",
    text: "Een nieuwe naam, een volledig nieuw logo of een fundamenteel andere marktpositie is geen verborgen onderdeel van de refresh. Daarvoor volgt een apart traject.",
  },
];

export default function MerkPage() {
  return (
    <>
      <PageHero
        eyebrow="Merkidentiteit"
        title="Een herkenbare uitstraling. Overal dezelfde basis."
        text="Website, offerte en later ook campagne volgen dezelfde goedgekeurde merkgegevens. Zo wordt een kleuraanpassing geen onbedoelde rebranding."
      />
      <section className="container-page grid gap-6 py-16 md:grid-cols-3">
        {routes.map((route) => (
          <article key={route.title} className="rounded-2xl border border-stone/60 p-6">
            <h2 className="font-heading text-2xl text-ink">{route.title}</h2>
            <p className="mt-3 text-sm leading-6 text-olive">{route.text}</p>
          </article>
        ))}
      </section>
      <section className="border-y border-stone/40 bg-muted/40">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl text-ink">Wat in het merkprofiel staat</h2>
            <p className="mt-4 text-base leading-7 text-olive">
              Elke klant krijgt een merkprofiel dat losstaat van de website. Nieuwe concepten
              overschrijven nooit automatisch een live site. Eerst wordt zichtbaar wat verandert;
              daarna volgt toestemming.
            </p>
          </div>
          <ul className="grid gap-3 text-sm leading-6 text-olive sm:grid-cols-2">
            {[
              "Doelgroep en kernbelofte",
              "Diensten en bewijs",
              "Schrijfstijl",
              "Kleur, typografie, beeld",
              "Verboden of onbevestigde claims",
              "Rechten op beeld en tekst",
            ].map((item) => (
              <li key={item} className="rounded-xl bg-ivory px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="container-page py-16">
        <ButtonLink href="/aanvraag">
          Bespreek de merkroute
          <ArrowRight data-icon="inline-end" />
        </ButtonLink>
      </section>
      <CtaBand />
    </>
  );
}
