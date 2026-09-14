import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHero } from "@/components/page-hero";
import { cta, routes, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Neem contact op met Kopvast voor het websitepakket of een maatwerkvraag.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Zeg wat je nodig hebt."
        text="Twee duidelijke routes. Geen vrijblijvende kennismaking als je al weet wat je zoekt."
      />
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        <article className="rounded-2xl border border-stone/50 p-6 md:p-8">
          <h2 className="text-2xl text-ink">Standaard website</h2>
          <p className="mt-3 text-sm leading-6 text-olive">
            Je wilt het vaste pakket. Je ziet vooraf wat je krijgt en wat het kost.
          </p>
          <div className="mt-6">
            <ButtonLink href={cta.start.href}>
              {cta.start.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </article>
        <article className="rounded-2xl border border-stone/50 p-6 md:p-8">
          <h2 className="text-2xl text-ink">Maatwerk</h2>
          <p className="mt-3 text-sm leading-6 text-olive">
            Grotere website, webshop, campagne of een specifieke koppeling. Wij beoordelen wat nodig is.
          </p>
          <div className="mt-6">
            <ButtonLink href={cta.custom.href} variant="outline">
              {cta.custom.label}
            </ButtonLink>
          </div>
        </article>
      </section>
      <section className="border-t border-stone/40 bg-[#f7f4ec]">
        <div className="container-page py-16">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Direct</p>
          <p className="mt-3 text-2xl text-ink">{site.email}</p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
            Liever eerst een snelle blik op je huidige site?{" "}
            <a className="underline underline-offset-4" href={routes.check}>
              Doe de websitecheck
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
