import type { Metadata } from "next";
import { Suspense } from "react";
import { MaatwerkForm } from "@/components/maatwerk-form";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Maatwerk",
  description: "Bespreek een grotere website, webshop, campagne of specifieke koppeling. Geen automatische vaste prijs.",
};

export default function CustomPage() {
  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Maatwerk</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-5xl">
          Meer nodig? Dan kijken we verder.
        </h1>
        <p className="mt-5 text-base leading-7 text-olive">
          Grotere website, webshop, reserveringssysteem, klantomgeving of specifieke koppeling? We maken een
          passende aanpak en prijs. Maatwerk valt buiten de vaste pakketprijs.
        </p>
        <p className="mt-4 text-sm leading-6 text-olive">
          Zoek je het standaard websitepakket?{" "}
          <a className="underline underline-offset-4" href={routes.aanvraag}>
            Start met Kopvast Website
          </a>
          .
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <MaatwerkForm />
      </Suspense>
    </section>
  );
}
