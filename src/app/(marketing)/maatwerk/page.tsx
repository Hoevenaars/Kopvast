import type { Metadata } from "next";
import { Suspense } from "react";
import { MaatwerkForm } from "@/components/maatwerk-form";
import { pageMeta, routes } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  routes.maatwerk,
  "Maatwerk",
  "Voor een grotere of specifiekere vraag: webshop, portaal, koppeling of campagne. De prijs staat in het voorstel."
);

export default function CustomPage() {
  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Maatwerk</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-5xl">
          Meer nodig? Dan kijken we verder.
        </h1>
        <p className="mt-5 text-base leading-7 text-olive">
          Maatwerk is voor een grotere of specifiekere vraag: extra pagina’s, een webshop, een klantomgeving,
          een campagne of een koppeling. We maken een passende aanpak. De prijs staat in het voorstel, niet in deze pagina.
        </p>
        <p className="mt-4 text-sm leading-6 text-olive">
          Weet je nog niet of het maatwerk is?{" "}
          <a className="underline underline-offset-4" href={routes.contact}>
            Stel eerst een vrijblijvende vraag
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
