import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { PageHero } from "@/components/page-hero";
import { ArrowRight } from "lucide-react";
import { cta, pageMeta, processSteps, routes, services } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  routes.werkwijze,
  "Werkwijze",
  "Eerst verkennen, dan scope en voorstel, dan uitvoering. Dezelfde werkwijze voor websites, merk, marketing en automatisering."
);

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="Werkwijze"
        title="Eerst begrijpen. Dan een voorstel. Dan maken."
        text="De werkwijze geldt voor websites, merk en ontwerp, marketing en automatisering. Eerst verkennen, dan een concrete scope, dan een voorstel, dan de uitvoering."
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
          <h2 className="text-3xl text-ink">Geldt voor elke dienst</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {services.map((item) => (
              <li key={item.href}>
                <a className="text-sm text-ink underline-offset-4 hover:underline" href={item.href}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-base leading-7 text-olive">
            Hosting, beheer of een volgende opdracht volgt alleen als dat is afgesproken. Een eerste gesprek
            is geen koop.
          </p>
          <div className="mt-8">
            <ButtonLink href={cta.discuss.href}>
              {cta.discuss.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
