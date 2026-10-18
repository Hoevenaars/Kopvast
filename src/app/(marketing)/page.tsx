import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { ScanForm } from "@/components/scan-form";
import { ConceptLabel } from "@/components/work/frames";
import { ArdeaDesktop, LindenhofDesktop, NoraDesktop } from "@/components/work/concept-mocks";
import { cta, needs, pageMeta, processSteps, reasons, routes, services, site } from "@/lib/site";

export const metadata: Metadata = pageMeta(routes.home, site.promise, site.description);

const previews = [
  { frame: LindenhofDesktop, caption: "Website, offerte en social" },
  { frame: ArdeaDesktop, caption: "Website, presentatie en handtekening" },
  { frame: NoraDesktop, caption: "Merkrefresh, website en flyer" },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-ivory">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">{site.tagline}</p>
            <h1 className="font-heading mt-4 text-[2.5rem] leading-[1.05] text-ink sm:text-5xl lg:text-[4.25rem]">
              Sterk zichtbaar.
              <br />
              <em className="italic">Slim geregeld.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-olive md:text-lg">
              Sterk werk verdwijnt als de site, het merk of de opvolging achterblijft. Kopvast maakt je
              online even duidelijk als in het echt, en haalt terugkerend handwerk uit de weg.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-olive">
              Een bericht is genoeg om te kijken wat de eerste zinvolle stap is.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={cta.discover.href}>
                {cta.discover.label}
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <Link href={cta.work.href} className="inline-flex items-center border-b border-ink pb-0.5 text-sm text-ink">
                {cta.work.label}
              </Link>
            </div>
          </div>
          <div>
            <LindenhofDesktop priority />
            <ConceptLabel className="mt-4" />
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-[#f7f4ec]">
        <div className="container-page py-16 lg:py-20">
          <h2 className="max-w-2xl text-3xl leading-tight text-ink md:text-4xl">Herkenbaar?</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {needs.map((item) => (
              <li key={item} className="rounded-2xl border border-stone/50 bg-ivory px-5 py-4 text-lg text-ink">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-base leading-7 text-olive">
            Kopvast helpt om dit praktisch en professioneel op te lossen.
          </p>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page py-16 lg:py-20">
          <p className="text-xs tracking-[0.18em] text-olive uppercase">Diensten</p>
          <h2 className="mt-3 max-w-2xl text-3xl text-ink md:text-4xl">Vier manieren waarop we meewerken.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {services.map((item) => (
              <article key={item.href} className="flex flex-col rounded-2xl border border-stone/50 p-6">
                <h3 className="text-2xl text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-olive">{item.text}</p>
                <p className="mt-4 flex-1 text-sm leading-6 text-ink">{item.result}</p>
                <Link href={item.href} className="mt-5 inline-flex items-center gap-1 text-sm text-ink hover:underline">
                  Bekijk {item.label.toLowerCase()}
                  <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page py-16 lg:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs tracking-[0.18em] text-olive uppercase">Werk</p>
              <h2 className="mt-3 text-3xl text-ink md:text-4xl">Voorbeelden van de aanpak</h2>
            </div>
            <Link href={routes.werk} className="inline-flex items-center gap-1 text-sm text-ink hover:underline">
              Bekijk de conceptcases
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-olive">
            Conceptcases: zo kan een website, een merk en een set middelen samenlopen.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {previews.map((item) => {
              const Frame = item.frame;
              return (
                <article key={item.caption} className="rounded-2xl border border-stone/50 p-4">
                  <Frame compact />
                  <p className="mt-4 text-sm font-medium text-ink">{item.caption}</p>
                  <ConceptLabel className="mt-2" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f4ec]">
        <div className="container-page py-16 lg:py-20">
          <h2 className="text-3xl text-ink md:text-4xl">Waarom Kopvast?</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {reasons.map((item) => (
              <article key={item.title}>
                <h3 className="text-xl text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-olive">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Werkwijze</p>
            <h2 className="font-heading mt-3 text-4xl leading-tight text-ink">Van kennismaken tot oplevering.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-olive">
              Dezelfde vier stappen voor websites, merk, marketing en automatisering.
            </p>
            <Link href={routes.werkwijze} className="mt-6 inline-flex items-center gap-1 text-sm text-ink hover:underline">
              Bekijk de werkwijze
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
            <h2 className="font-heading text-4xl leading-tight text-ink">Al een website?</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-olive">
              Vul je adres in. Je krijgt maximaal drie concrete aandachtspunten, of een eerlijke status als de
              check niet lukt.
            </p>
          </div>
          <ScanForm compact />
        </div>
      </section>

      <CtaBand primary={cta.discuss} />
    </>
  );
}
