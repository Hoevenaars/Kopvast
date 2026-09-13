import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { BrandRefreshCard, FlyerCard, NoraDesktop } from "@/components/work/concept-mocks";
import { ConceptLabel } from "@/components/work/frames";
import { cta, merkRefreshItems, products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Merkidentiteit",
  description:
    "Heb je al een goede huisstijl? Dan gebruiken we die. Is je uitstraling verouderd of versnipperd? Dan scherpen we hem aan.",
};

export default function MerkPage() {
  return (
    <>
      <PageHero
        eyebrow="Merk"
        title="Je website kan alleen zo sterk zijn als je merk."
        text="Heb je al een goede huisstijl? Dan gebruiken we die. Is je uitstraling verouderd, versnipperd of niet meer passend bij het bedrijf dat je nu bent? Dan scherpen we hem aan."
        actions={
          <ButtonLink href={cta.refresh.href}>
            {cta.refresh.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        }
      />

      <section className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <NoraDesktop />
        <div>
          <ConceptLabel />
          <p className="mt-4 text-base leading-7 text-olive">
            Een uitstraling die klopt. Op je website en daarbuiten. We bouwen voort op wat goed is en
            scherpen aan wat beter kan.
          </p>
        </div>
      </section>

      <section id="merkrefresh" className="scroll-mt-24 border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">{products.merkrefresh.name}</p>
            <h2 className="mt-3 text-3xl text-ink md:text-4xl">Geen onnodige rebranding.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-olive">{products.merkrefresh.summary}</p>
            <p className="mt-6 font-heading text-5xl text-ink">Vanaf {products.merkrefresh.price}</p>
            <p className="mt-1 text-xs text-stone">{products.merkrefresh.cadence}</p>
            <div className="mt-8">
              <ButtonLink href={`${cta.custom.href}?type=merk`}>
                Bespreek de merkrefresh
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
            </div>
          </div>
          <div>
            <h3 className="text-xl text-ink">Mogelijke onderdelen</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {merkRefreshItems.map((item) => (
                <li key={item} className="rounded-xl bg-ivory px-4 py-3 text-sm text-olive">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <BrandRefreshCard />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-16 md:grid-cols-2">
        <article className="rounded-2xl border border-stone/50 p-6">
          <h2 className="text-2xl text-ink">We bouwen voort op wat werkt</h2>
          <p className="mt-3 text-sm leading-6 text-olive">
            Een goede bestaande huisstijl blijft staan. De website wordt sterker zonder dat je een nieuwe
            merkdiscussie koopt.
          </p>
        </article>
        <article className="rounded-2xl border border-stone/50 p-6">
          <h2 className="text-2xl text-ink">Opnieuw positioneren kan apart</h2>
          <p className="mt-3 text-sm leading-6 text-olive">
            Een nieuwe naam, een volledig nieuw logo of een fundamenteel andere marktpositie is geen
            verborgen onderdeel van de refresh. Daarvoor volgt een apart traject.
          </p>
        </article>
      </section>

      <section className="container-page pb-16">
        <FlyerCard />
      </section>

      <CtaBand title="Eerst het merk scherp. Daarna de middelen." />
    </>
  );
}
