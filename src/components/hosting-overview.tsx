import { commercialPriceLabel, publicRecurringProducts } from "@/lib/products";

export function HostingOverview() {
  const plans = publicRecurringProducts();

  return (
    <section id="hosting" className="scroll-mt-24 border-y border-stone/40">
      <div className="container-page py-16">
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Hosting en beheer</p>
        <h2 className="mt-3 max-w-3xl text-3xl text-ink md:text-4xl">
          Continuïteit na oplevering. Alleen als je dat afspreekt.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
          Hosting en beheer zitten niet in de websiteprijs. Ze starten wanneer ze in het voorstel staan en de
          site live gaat. Een concept bekijken start geen abonnement.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((product) => (
            <article key={product.id} className="flex flex-col rounded-2xl border border-stone/50 p-6">
              <h3 className="text-xl text-ink">{product.name}</h3>
              <p className="mt-3 font-heading text-4xl text-ink">{commercialPriceLabel(product)}</p>
              <p className="mt-4 flex-1 text-sm leading-6 text-olive">{product.description}</p>
              <ul className="mt-5 space-y-2">
                {(product.includes ?? []).map((item) => (
                  <li key={item} className="text-sm leading-6 text-olive">
                    · {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 max-w-3xl space-y-3 text-sm leading-6 text-olive">
          <p>
            Hosting houdt de site bereikbaar. Hosting Plus voegt uitgebreidere monitoring, een periodieke
            technische controle en kleine technische ondersteuning toe. Beheer omvat hosting plus onderhoud,
            backups en twee kleine wijzigingen per maand.
          </p>
          <p>
            Geen onbeperkte support. Looptijd en opzegging staan in het voorstel. Voor beheer geldt wat in de
            voorwaarden staat: maandelijks opzegbaar, met een opzegtermijn van een maand.
          </p>
        </div>
      </div>
    </section>
  );
}
