import type { Metadata } from "next";
import { InterestForm } from "@/components/interest-form";
import { PageHero } from "@/components/page-hero";
import { pageMeta, routes, site } from "@/lib/site";

function first(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().slice(0, 180) ?? "";
}

export const metadata: Metadata = pageMeta(
  routes.contact,
  "Contact",
  "Stel een vrijblijvende vraag over een website, merk, marketing of automatisering."
);

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Bespreek je idee."
        text="Een korte vraag is genoeg. Kies het onderwerp dat het dichtst in de buurt komt. We reageren persoonlijk."
      />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Direct</p>
          <p className="mt-3 text-2xl text-ink">
            <a className="underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-olive">
            Heb je nog geen website? Laat dat veld leeg. We hebben naam, e-mail, bedrijfsnaam, onderwerp en
            een korte toelichting nodig om je vraag op te volgen.
          </p>
        </div>
        <InterestForm
          subject={first(params.dienst)}
          company={first(params.bedrijf)}
          website={first(params.website)}
          landing={first(params.landing) || "/contact"}
          cta={first(params.cta)}
          utmSource={first(params.utm_source)}
          utmMedium={first(params.utm_medium)}
          utmCampaign={first(params.utm_campaign)}
        />
      </section>
    </>
  );
}
