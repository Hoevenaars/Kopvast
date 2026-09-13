import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { cta, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Over Kopvast",
  description:
    "Kopvast helpt ondernemers en organisaties professioneler en herkenbaarder naar buiten te komen.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Over Kopvast"
        title="Goed ondernemerschap verdient een sterke uitstraling."
        text="Kopvast is opgericht vanuit één simpele frustratie: goede bedrijven worden online verrassend vaak minder sterk gepresenteerd dan ze in werkelijkheid zijn."
      />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="max-w-xl">
          <p className="text-base leading-7 text-olive">
            Wij combineren strategie, ontwerp en een strak proces om websites en merken sneller,
            consistenter en zonder onnodige overhead te realiseren.
          </p>
          <p className="mt-4 text-base leading-7 text-olive">
            Niet eindeloos praten. Eerst scherp krijgen wat klopt. Daarna bouwen.
          </p>
          <p className="mt-4 text-base leading-7 text-olive">
            Slim georganiseerd. Menselijk beoordeeld. We werken efficiënt, zodat meer van je budget naar het
            eindresultaat gaat.
          </p>
          <p className="mt-4 text-base leading-7 text-olive">
            De eerste stap is meestal een website. Daarna volgen merkidentiteit, middelen en maatwerk wanneer
            dat nodig is.
          </p>
        </div>
        <div className="rounded-2xl border border-stone/50 p-6">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Contact</p>
          <p className="mt-3 text-lg text-ink">{site.email}</p>
          <p className="mt-4 text-sm leading-6 text-olive">
            Geen anoniem formulier zonder gezicht. Je krijgt een bevestiging en een menselijke beoordeling.
          </p>
          <div className="mt-6">
            <ButtonLink href={cta.package.href}>
              {cta.package.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-6 py-16 md:grid-cols-3">
          {[
            {
              title: "Scherp",
              text: "Eerst helder krijgen wat nodig is. Geen ruis, geen extra lagen.",
            },
            {
              title: "Stevig",
              text: "Vaste prijzen waar het kan. Een aparte aanpak waar het moet.",
            },
            {
              title: "Uitvoerend",
              text: "We ontwerpen, bouwen en leveren middelen die je kunt gebruiken.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl bg-ivory p-6">
              <h2 className="text-2xl text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
