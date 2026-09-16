import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { termsSections } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Voorwaarden",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Voorwaarden"
        title="Eerst de afspraken die we nu al hard maken."
        text="Algemene voorwaarden worden voor publieke verkoop door een jurist beoordeeld. Tot die tijd gelden onderstaande productgrenzen als werkwijze, niet als volledig contract."
      />
      <article className="container-page max-w-3xl space-y-8 py-16 text-sm leading-7 text-olive">
        {termsSections().map((section) => (
          <section key={section.title}>
            <h2 className="font-heading text-2xl text-ink">{section.title}</h2>
            <p className="mt-3">{section.body}</p>
          </section>
        ))}
      </article>
    </>
  );
}
