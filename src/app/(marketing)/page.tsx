import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { MaatwerkBlock } from "@/components/maatwerk-block";
import { ScanForm } from "@/components/scan-form";
import { WebsitePackage } from "@/components/website-package";
import { ConceptLabel } from "@/components/work/frames";
import {
  ArdeaDesktop,
  BrandRefreshCard,
  FlyerCard,
  HeroWork,
  LindenhofDesktop,
  NoraDesktop,
  PresentationCard,
  QuoteCard,
  SignatureCard,
  SocialCard,
} from "@/components/work/concept-mocks";
import { conceptCases, cta, processSteps, products, propositions, routes, site } from "@/lib/site";

export const metadata: Metadata = {
  title: site.promise,
  description: site.description,
};

export default function HomePage() {
  return (
    <>
      <section className="bg-ivory">
        <div className="container-page grid items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20">
          <div>
            <h1 className="font-heading text-[2.35rem] leading-[1.08] text-ink sm:text-5xl lg:text-[4rem]">
              Je bedrijf staat ergens voor.
              <br />
              <em className="italic">Laat dat zien.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-olive">
              Websites, merken en middelen die laten zien wat je bedrijf waard is.
            </p>
            <p className="mt-3 max-w-xl text-base leading-7 text-olive">
              Duidelijke pakketten waar het kan. Maatwerk waar het nodig is.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={cta.package.href}>
                {cta.package.label}
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <Link href={cta.custom.href} className="inline-flex items-center border-b border-ink pb-0.5 text-sm text-ink">
                {cta.custom.label}
              </Link>
            </div>
            <p className="mt-6 text-sm text-olive">Vaste prijzen · Heldere afspraken · Premium uitvoering</p>
            <p className="mt-2 text-sm text-olive">Website {products.website.priceLabel}</p>
          </div>
          <div className="pb-16 md:pb-20">
            <HeroWork />
            <ConceptLabel className="mt-12 md:mt-16" />
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page py-16 lg:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs tracking-[0.18em] text-olive uppercase">Werk</p>
              <h2 className="mt-3 text-3xl text-ink md:text-4xl">Wat Kopvast maakt</h2>
            </div>
            <Link href={routes.werk} className="inline-flex items-center gap-1 text-sm text-ink hover:underline">
              Bekijk alle conceptcases
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-stone/50 p-4">
              <LindenhofDesktop compact />
              <p className="mt-4 text-sm font-medium text-ink">Website + offerte + social</p>
              <ConceptLabel className="mt-2" />
            </article>
            <article className="rounded-2xl border border-stone/50 p-4">
              <ArdeaDesktop compact />
              <p className="mt-4 text-sm font-medium text-ink">Website + presentatie + handtekening</p>
              <ConceptLabel className="mt-2" />
            </article>
            <article className="rounded-2xl border border-stone/50 p-4">
              <NoraDesktop compact />
              <p className="mt-4 text-sm font-medium text-ink">Merkrefresh + website + flyer</p>
              <ConceptLabel className="mt-2" />
            </article>
          </div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page grid gap-8 py-16 md:grid-cols-3 lg:py-20">
          {propositions.map((item) => (
            <article key={item.href} className="flex flex-col border-t border-stone/50 pt-6">
              <p className="text-xs tracking-[0.16em] text-olive uppercase">{item.label}</p>
              <h2 className="mt-3 text-2xl leading-snug text-ink">{item.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-olive">{item.text}</p>
              {"price" in item && item.price ? <p className="mt-4 text-sm text-ink">{item.price}</p> : null}
              <Link href={item.href} className="mt-5 inline-flex items-center gap-1 text-sm text-ink hover:underline">
                {item.cta}
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <WebsitePackage />
      <MaatwerkBlock />

      <section className="bg-ivory">
        <div className="container-page py-16 lg:py-20">
          <p className="text-xs tracking-[0.18em] text-olive uppercase">Cases</p>
          <h2 className="font-heading mt-3 max-w-2xl text-4xl leading-tight text-ink">
            Eerst zichtbaar werk. Daarna echte klantcases.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-olive">
            Tot er toestemming is voor echte cases laten we zien hoe Kopvast werkt. Elk voorbeeld is een
            conceptcase, geen verzonnen resultaat.
          </p>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {conceptCases.map((item) => (
              <Link key={item.slug} href={`${routes.werk}#${item.slug}`} className="group">
                <p className="text-xs tracking-[0.16em] text-olive uppercase">{item.sector}</p>
                <h3 className="mt-2 text-2xl text-ink group-hover:underline">{item.name}</h3>
                <p className="mt-2 text-sm leading-6 text-olive">{item.title}</p>
                <ConceptLabel className="mt-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Merk & middelen</p>
            <h2 className="mt-3 text-3xl leading-tight text-ink md:text-4xl">
              Een uitstraling die je ook kunt gebruiken.
            </h2>
            <p className="mt-4 text-base leading-7 text-olive">
              Heb je al een sterke huisstijl? Dan bouwen we daarop voort. Loopt je uitstraling achter? Dan
              scherpen we kleur, typografie, beeldtaal en merkgebruik aan.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={routes.merk} className="inline-flex items-center gap-1 text-sm text-ink hover:underline">
                Bekijk merkidentiteit
                <ArrowRight className="size-4" />
              </Link>
              <Link href={routes.marketing} className="inline-flex items-center gap-1 text-sm text-ink hover:underline">
                Bekijk marketingmiddelen
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BrandRefreshCard />
            <QuoteCard />
            <PresentationCard />
            <div className="grid gap-4">
              <SignatureCard />
              <SocialCard brand="Lindenhof" title="Een datum aanvragen, zonder ruis." image="/images/venue.jpg" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Werkwijze</p>
            <h2 className="font-heading mt-3 text-4xl leading-tight text-ink">Van inzicht naar resultaat.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-olive">
              Slim georganiseerd. Menselijk beoordeeld. Je ziet vooraf wat je krijgt.
            </p>
            <Link href={cta.package.href} className="mt-6 inline-flex items-center gap-1 text-sm text-ink hover:underline">
              {cta.package.label}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {processSteps.map((step) => (
              <li key={step.n}>
                <p className="text-sm tracking-[0.14em] text-copper uppercase">{step.n}</p>
                <h3 className="mt-2 text-xl text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-olive">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-heading text-4xl leading-tight text-ink">Benieuwd wat wij zien?</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-olive">
              Vul je websiteadres in. Je krijgt maximaal drie concrete aandachtspunten.
            </p>
          </div>
          <ScanForm compact />
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Over Kopvast</p>
            <h2 className="font-heading mt-3 text-4xl leading-tight text-ink">
              Goed ondernemerschap verdient een sterke uitstraling.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-olive">
              Kopvast helpt ondernemers en organisaties professioneler en herkenbaarder naar buiten te komen.
              Niet eindeloos praten. Eerst scherp krijgen wat klopt. Daarna bouwen.
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-olive">
              We werken efficiënt, zodat meer van je budget naar het eindresultaat gaat.
            </p>
            <Link href={routes.over} className="mt-6 inline-flex items-center gap-1 text-sm text-ink hover:underline">
              Over Kopvast
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <FlyerCard />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
