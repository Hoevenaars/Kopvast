import type { Metadata } from "next";
import { AcquisitionConfirm } from "@/components/acquisition-confirm";
import { AcquisitionStartCopy } from "@/components/acquisition-start-block";
import { AcquisitionStartForm } from "@/components/acquisition-start-form";
import { loadTrackedLanding } from "@/lib/acquisition-clicks";
import { confirmedInterestCopy, parseStartSearchParams } from "@/lib/acquisition-start";
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
    t?: string | string[];
  }>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const params = parseStartSearchParams(raw);
  const who = params.company || params.website;
  return {
    title: who ? `Interesse voor ${who}` : "Vrijblijvende interesse",
    description: "Bevestig je interesse. Dit is geen opdracht en er staat geen prijs in deze stap.",
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
    t?: string | string[];
  }>;
}) {
  const raw = await searchParams;
  const params = parseStartSearchParams(raw);
  const token = typeof raw.t === "string" ? raw.t : "";
  const landing = token ? await loadTrackedLanding(token) : null;
  const known = landing
    ? {
        choice: landing.choice,
        website: landing.website,
        company: landing.company,
      }
    : params;
  const copy = landing ? confirmedInterestCopy(landing) : null;

  return (
    <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:py-24">
      {landing && copy ? (
        <div>
          <p className="text-xs tracking-[0.18em] text-olive uppercase">{copy.eyebrow}</p>
          <h1 className="font-heading mt-4 text-3xl leading-tight text-ink md:text-5xl">{copy.title}</h1>
          <p className="mt-5 text-base leading-7 text-olive">{copy.text}</p>
          {landing.company ? (
            <p className="mt-4 text-sm leading-6 text-olive">Dit gaat over {landing.company}. Je gegevens staan al bij ons.</p>
          ) : null}
        </div>
      ) : (
        <AcquisitionStartCopy params={known} heading="h1" />
      )}
      {landing ? (
        <AcquisitionConfirm
          token={landing.token}
          choice={landing.choice}
          company={landing.company}
          hasWebsite={landing.hasWebsite}
          reason={landing.reason}
        />
      ) : (
        <AcquisitionStartForm {...known} />
      )}
    </section>
  );
}
