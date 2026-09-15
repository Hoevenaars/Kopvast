import type { Metadata } from "next";
import { Suspense } from "react";
import { WebsiteAanvraagForm } from "@/components/website-aanvraag-form";
import { products, routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start met Kopvast Website",
  description: "Vraag het vaste websitepakket aan. Je ziet vooraf wat je krijgt en wat het kost.",
};

export default function RequestPage() {
  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Kopvast Website</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-5xl">
          Start met een website vanaf {products.website.price}
        </h1>
        <p className="mt-5 text-base leading-7 text-olive">
          Je doorloopt zelf de stappen. Aan het eind zie je de prijs en verstuur je de aanvraag. Meer nodig
          dan het vaste pakket? Ga naar{" "}
          <a className="underline underline-offset-4" href={routes.maatwerk}>
            maatwerk
          </a>
          .
        </p>
        <ul className="mt-8 space-y-3 text-sm leading-6 text-olive">
          <li>
            {products.website.name}: {products.website.price} {products.website.cadence}
          </li>
          <li>
            {products.beheer.name}: {products.beheer.price} {products.beheer.cadence}, vanaf livegang
          </li>
        </ul>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <WebsiteAanvraagForm />
      </Suspense>
    </section>
  );
}
