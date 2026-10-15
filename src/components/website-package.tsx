import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta, excludedWebsite, includedWebsite, products } from "@/lib/site";

export function WebsitePackage({ id = "pakket" }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 bg-ivory">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.18em] text-olive uppercase">{products.website.name}</p>
          <h2 className="font-heading mt-3 text-4xl leading-tight text-ink md:text-5xl">
            Een afgebakende website, met een bekende prijs.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-olive">
            {products.website.summary} De prijs hoort bij deze scope. Alles daarbuiten wordt apart beoordeeld.
          </p>
          <p className="mt-6 font-heading text-5xl text-ink">{products.website.price}</p>
          <p className="mt-1 text-xs text-stone">{products.website.cadence}</p>
          <div className="mt-8">
            <ButtonLink href={cta.website.href}>
              {cta.website.label}
              <ArrowRight data-icon="inline-end" />
            </ButtonLink>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-stone/50 bg-[#f7f4ec] p-6 md:p-8">
            <h3 className="text-xl text-ink">Inbegrepen</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {includedWebsite.map((item) => (
                <li key={item} className="text-sm leading-6 text-olive">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-stone/50 p-6 md:p-8">
            <h3 className="text-xl text-ink">Niet inbegrepen</h3>
            <ul className="mt-4 grid gap-2">
              {excludedWebsite.map((item) => (
                <li key={item} className="text-sm leading-6 text-olive">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
