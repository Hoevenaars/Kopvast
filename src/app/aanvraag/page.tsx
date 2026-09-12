import type { Metadata } from "next";
import { Suspense } from "react";
import { AanvraagForm } from "@/components/aanvraag-form";
import { products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aanvraag",
  description:
    "Vraag Kopvast Website, beheer, een merkrefresh of sjablonen aan. Je hoeft geen verkoopgesprek te boeken.",
};

export default function RequestPage() {
  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Aanvraag</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-ink md:text-5xl">
          Zeg wat je nodig hebt. Wij zetten de volgende stap.
        </h1>
        <p className="mt-5 text-base leading-7 text-olive">
          Je kunt dit scherm zelf doorlopen. Voor inhoudelijke twijfel is er contact, maar we maken
          een mens niet onbereikbaar om het proces strak te houden.
        </p>
        <ul className="mt-8 space-y-3 text-sm leading-6 text-olive">
          <li>
            {products.website.name}: {products.website.price} {products.website.cadence}
          </li>
          <li>
            {products.beheer.name}: {products.beheer.price} {products.beheer.cadence}
          </li>
          <li>
            {products.merkrefresh.name}: {products.merkrefresh.price}
          </li>
          <li>
            {products.sjablonen.name}: {products.sjablonen.price}
          </li>
        </ul>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <AanvraagForm />
      </Suspense>
    </section>
  );
}
