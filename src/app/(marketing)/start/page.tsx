import type { Metadata } from "next";
import { AcquisitionStartCopy } from "@/components/acquisition-start-block";
import { AcquisitionStartForm } from "@/components/acquisition-start-form";
import { parseStartSearchParams } from "@/lib/acquisition-start";
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
  searchParams: Promise<{
    keuze?: string | string[];
    website?: string | string[];
    bedrijf?: string | string[];
    prijs?: string | string[];
  }>;
}): Promise<Metadata> {
  const params = parseStartSearchParams(await searchParams);
  const who = params.company || params.website;
  return {
    title: who ? `Start met Kopvast Website voor ${who}` : "Start met Kopvast Website",
    description: "Vul je gegevens in en start met het websitepakket. Prijs en scope staan erbij.",
    robots,
    alternates: { canonical: `${site.url}/start` },
  };
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{
    keuze?: string | string[];
    website?: string | string[];
    bedrijf?: string | string[];
    prijs?: string | string[];
  }>;
}) {
  const params = parseStartSearchParams(await searchParams);

  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:py-24">
      <AcquisitionStartCopy params={params} heading="h1" />
      <AcquisitionStartForm {...params} />
    </section>
  );
}
