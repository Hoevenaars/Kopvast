import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Cookies",
};

export default function CookiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Cookies"
        title="Geen tracking om te kunnen werken."
        text="Deze site gebruikt geen advertentiecookies en geen onzichtbare opvolging op basis van geopende e-mails."
      />
      <article className="container-page max-w-3xl space-y-6 py-16 text-sm leading-7 text-olive">
        <p>
          Functionele cookies of lokale opslag kunnen nodig zijn om het formulier of de websitecheck
          betrouwbaar te laten werken. Privacyarme statistiek richten we pas in wanneer daar een
          passende grondslag en inrichting voor is.
        </p>
        <p>
          Trackingcookies worden niet geplaatst zonder de vereiste toestemming. Een websitecheck of
          paginaweergave is belangstelling, geen aankoopintentie en geen marketingtoestemming.
        </p>
      </article>
    </>
  );
}
