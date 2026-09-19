import type { Metadata } from "next";
import { DomainInterestForm } from "@/components/domain-interest-form";
import { parseDomainParam } from "@/lib/domain-landing";
import { site } from "@/lib/site";

const robots: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}): Promise<Metadata> {
  const domain = parseDomainParam((await searchParams).domain);
  return {
    title: domain ? `Interesse in ${domain}` : "Domein",
    description: "Dit domein is vastgelegd door Kopvast.",
    robots,
    alternates: { canonical: `${site.url}/domein` },
  };
}

export default async function DomeinPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const domain = parseDomainParam((await searchParams).domain);

  return (
    <main className="container-page max-w-2xl py-16 md:py-24">
      <p className="text-xs tracking-[0.16em] text-olive uppercase">Domein</p>
      <h1 className="mt-4 font-heading text-[2.15rem] leading-[1.12] text-ink sm:text-5xl">
        {domain ? `Interesse in ${domain}?` : "Dit domein is vastgelegd door Kopvast."}
      </h1>
      {domain ? (
        <>
          <p className="mt-6 text-base leading-7 text-olive">Dit domein is vastgelegd door Kopvast.</p>
          <p className="mt-3 text-base leading-7 text-olive">
            Wil je het domein overnemen? Vraag de prijs op of breng direct een bod uit.
          </p>
        </>
      ) : (
        <p className="mt-6 text-base leading-7 text-olive">
          Interesse in dit domein? Vraag vrijblijvend naar de prijs of breng direct een bod uit.
        </p>
      )}

      <div className="mt-10">
        <DomainInterestForm domain={domain} />
      </div>
    </main>
  );
}
