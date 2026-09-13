import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta, includedWebsite, products } from "@/lib/site";

export function WebsitePackage({
  id = "pakket",
  showStart = true,
}: {
  id?: string;
  showStart?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24 bg-ivory">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.18em] text-olive uppercase">Websitepakket</p>
          <h2 className="font-heading mt-3 text-4xl leading-tight text-ink md:text-5xl">
            Een sterke website vanaf {products.website.price}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-olive">
            Geen offertecircus voor een standaard website. Je ziet vooraf wat je krijgt, hoe we werken en wat
            het kost.
          </p>
          {showStart ? (
            <div className="mt-8">
              <ButtonLink href={cta.start.href}>
                {cta.start.label}
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-stone/50 bg-[#f7f4ec] p-6 md:p-8">
          <p className="text-sm text-olive">{products.website.name}</p>
          <p className="mt-2 font-heading text-5xl text-ink">{products.website.price}</p>
          <p className="mt-1 text-xs text-stone">{products.website.cadence}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {includedWebsite.map((item) => (
              <li key={item} className="text-sm leading-6 text-olive">
                · {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-olive">
            Meer nodig dan zes pagina’s of standaardfunctionaliteit? Dan maken we een maatwerkvoorstel.
          </p>
        </div>
      </div>
    </section>
  );
}
