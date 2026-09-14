import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { cta, processSteps } from "@/lib/site";

export const metadata: Metadata = {
  title: "Werkwijze",
  description: "Van inzicht naar resultaat. Vier duidelijke stappen, zonder eeuwig traject.",
};

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="Werkwijze"
        title="Van inzicht naar resultaat."
        text="Eerst scherp krijgen wat klopt. Daarna bouwen. Je ziet op elk moment wat klaar is, wat jij moet doen en wat buiten de vaste prijs valt."
      />
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {processSteps.map((step) => (
          <article key={step.title} className="rounded-2xl border border-stone/50 p-6">
            <p className="text-sm tracking-[0.14em] text-copper uppercase">{step.n}</p>
            <h2 className="mt-3 text-2xl text-ink">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-olive">{step.text}</p>
          </article>
        ))}
      </section>
      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page py-16">
          <h2 className="text-3xl text-ink">Wat we niet doen</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
            Geen publicatie zonder akkoord. Geen verzonnen resultaten. Geen automatische opvolging zonder
            toestemming. Geen rebranding omdat het sneller klinkt.
          </p>
          <div className="mt-8">
            <ButtonLink href={cta.package.href}>
              {cta.package.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
