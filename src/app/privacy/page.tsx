import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="Alleen wat nodig is om je te helpen."
        text="Kopvast verwerkt persoonsgegevens spaarzaam. Deze pagina is een praktische toelichting, geen vervanging van juridisch advies."
      />
      <article className="container-page max-w-3xl space-y-8 py-16 text-sm leading-7 text-olive">
        <section>
          <h2 className="font-heading text-2xl text-ink">Wie is verantwoordelijk</h2>
          <p className="mt-3">
            Aanvragen via deze website worden behandeld door Kopvast, te bereiken via de
            formulieren of{" "}
            <a className="underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            . De rechtsvorm en verwerkersafspraken worden met jurist en accountant vastgelegd voordat
            er op schaal klantgegevens in een productieplatform landen.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Wat we verzamelen</h2>
          <p className="mt-3">
            Via het website- of maatwerkformulier: naam, e-mail, optioneel telefoon, bedrijf, website
            en toelichting. Via de websitecheck: het opgegeven publieke webadres en de openbare HTML
            van de homepage. Die check kan intern worden bewaard om te beoordelen of Kopvast Website
            past. We vullen ontbrekende bedrijfsgegevens niet aan met gissingen.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Waarom</h2>
          <p className="mt-3">
            Aanvragen slaan we op om je te kunnen helpen en om dubbele berichten te voorkomen. De
            websitecheck bestaat om je inzichten te tonen, een passend aanbod te laten zien en intern
            te bepalen of opvolging zinvol is. Een paginaweergave is geen toestemming voor marketing.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Bewaartermijn in de pilot</h2>
          <p className="mt-3">
            Interne beleidskeuze, geen wettelijke standaard: niet-actieve prospectdossiers na
            negentig dagen verwijderen of herbeoordelen. Contracten en administratie volgen later
            vast te stellen termijnen. Bij bezwaar tegen verwerking voor direct marketing stopt die
            verwerking.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl text-ink">Jouw rechten</h2>
          <p className="mt-3">
            Je kunt inzage, rectificatie of verwijdering vragen via {site.email}. Gebruik het
            contactformulier niet als kanaal voor gevoelige medische, financiële of strafrechtelijke
            gegevens.
          </p>
        </section>
      </article>
    </>
  );
}
