import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta } from "@/lib/site";

export function MaatwerkBlock() {
  return (
    <section className="border-y border-stone/40 bg-[#f7f4ec]">
      <div className="container-page grid gap-8 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <h2 className="font-heading text-4xl leading-tight text-ink md:text-5xl">
            Meer nodig? Dan maken we maatwerk.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-olive">
            Het vaste websitepakket is bewust strak afgebakend. Heb je een grotere website, webshop,
            reserveringssysteem, klantomgeving, extra talen of specifieke koppelingen nodig? Dan bekijken we
            wat nodig is en maken we een aparte aanpak, planning en prijs.
          </p>
          <p className="mt-4 text-sm text-olive">Maatwerk valt buiten de vaste pakketprijs.</p>
        </div>
        <div>
          <ButtonLink href={cta.customIdea.href}>
            {cta.customIdea.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
