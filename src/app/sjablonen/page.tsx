import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sjablonen",
  description:
    "Bewerkbare zakelijke en zichtbaarheidssjablonen die dezelfde merkbasis gebruiken als je website.",
};

export default function TemplatesPage() {
  return (
    <>
      <PageHero
        eyebrow="Sjablonenpakket"
        title="Niet nóg een los middel. Dezelfde merkbasis."
        text={`${products.sjablonen.summary} Prijs: ${products.sjablonen.price} ${products.sjablonen.cadence}.`}
      />
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        <article className="rounded-2xl border border-stone/60 p-6 md:p-8">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Zakelijk</p>
          <h2 className="mt-3 font-heading text-3xl text-ink">Offerte, presentatie, handtekening</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-olive">
            <li>· Offerte van maximaal vier pagina’s in DOCX</li>
            <li>· Presentatie met acht bewerkbare basisdia’s in PPTX</li>
            <li>· Geteste HTML-e-mailhandtekening</li>
            <li>· Geen automatisch juridisch voorwaardenpakket</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-stone/60 p-6 md:p-8">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Zichtbaarheid</p>
          <h2 className="mt-3 font-heading text-3xl text-ink">Social, flyer, nieuwsbrief</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-olive">
            <li>· Zes bewerkbare social lay-outs</li>
            <li>· Digitale flyer</li>
            <li>· Nieuwsbriefvorm</li>
            <li>· Tekst, beelden en toegestane kleuren zijn écht aanpasbaar</li>
          </ul>
        </article>
      </section>
      <section className="border-y border-stone/40 bg-muted/40">
        <div className="container-page py-16">
          <h2 className="font-heading text-3xl text-ink">Wat bewerkbaar betekent</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
            Een platte afbeelding in een PowerPoint is geen sjabloon. Je krijgt een ingevuld voorbeeld,
            een korte instructie en een schone basisversie. Lettertypen leveren we alleen mee wanneer
            daarvoor distributierecht is.
          </p>
          <div className="mt-8">
            <ButtonLink href="/aanvraag">
              Vraag het sjablonenpakket aan
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
