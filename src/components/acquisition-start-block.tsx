import { AcquisitionStartForm } from "@/components/acquisition-start-form";
import {
  formatOfferPrice,
  startLandingCopy,
  startPackageItems,
  type AcquisitionStartParams,
} from "@/lib/acquisition-start";
import { products } from "@/lib/site";

export function AcquisitionStartCopy({
  params,
  heading: Heading = "h2",
}: {
  params: AcquisitionStartParams;
  heading?: "h1" | "h2";
}) {
  const copy = startLandingCopy(params);
  const price = formatOfferPrice(params.offerPrice);

  return (
    <div>
      <p className="text-xs tracking-[0.18em] text-olive uppercase">{copy.eyebrow}</p>
      <Heading className="font-heading mt-4 text-3xl leading-tight text-ink md:text-5xl">{copy.title}</Heading>
      <p className="mt-5 text-base leading-7 text-olive">{copy.text}</p>
      <div className="mt-8 rounded-2xl border border-stone/50 bg-white p-6">
        <p className="text-sm text-olive">{products.website.name}</p>
        <p className="mt-2 font-heading text-5xl text-ink">{price}</p>
        <p className="mt-1 text-xs text-stone">{products.website.cadence}</p>
        <ul className="mt-6 grid gap-2">
          {startPackageItems().map((item) => (
            <li key={item} className="text-sm leading-6 text-olive">
              · {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-6 text-olive">
          {products.beheer.name} is optioneel vanaf livegang: {products.beheer.price} {products.beheer.cadence}.
        </p>
      </div>
    </div>
  );
}

export function AcquisitionStartBlock({
  params,
  className = "border-y border-stone/40 bg-[#f7f4ec]",
}: {
  params: AcquisitionStartParams;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <AcquisitionStartCopy params={params} />
        <AcquisitionStartForm {...params} />
      </div>
    </section>
  );
}
