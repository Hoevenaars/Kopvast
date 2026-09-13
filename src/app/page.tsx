import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { products } from "@/lib/site";

export const metadata: Metadata = {
  title: "Je bedrijf staat ergens voor. Laat dat zien.",
  description:
    "Kopvast helpt ondernemers hun bedrijf sterker naar buiten te brengen met een professionele website, een herkenbaar merk en duidelijke afspraken.",
};

const services = [
  {
    href: "/websites",
    title: "Websites",
    text: "Professionele websites die passen bij je bedrijf en aanvragen mogelijk maken.",
    icon: MonitorIcon,
    linkLabel: "Meer over websites",
  },
  {
    href: "/merkidentiteit",
    title: "Merkidentiteit",
    text: "Een herkenbare uitstraling die vertrouwen wekt en overal klopt.",
    icon: PenIcon,
    linkLabel: "Meer over merkidentiteit",
  },
  {
    href: "/sjablonen",
    title: "Sjablonen",
    text: "Bewerkbare offertes, presentaties en zichtbaarheidsmiddelen op dezelfde merkbasis.",
    icon: LayersIcon,
    linkLabel: "Meer over sjablonen",
  },
  {
    href: "/over-ons",
    title: "Samenwerken",
    text: "Wij helpen je bedrijf sterker presenteren. Vaste pakketten, duidelijke afspraken en een partner die meedenkt.",
    icon: CompassIcon,
    linkLabel: "Meer over Kopvast",
  },
];

const steps = [
  {
    n: "01",
    title: "Inzicht",
    text: "We brengen je kansen in kaart. Feiten die je kunt controleren.",
  },
  {
    n: "02",
    title: "Plan",
    text: "Je ontvangt een concreet voorstel met vaste prijs en scope.",
  },
  {
    n: "03",
    title: "Realisatie",
    text: "We ontwerpen, bouwen en vullen vanuit goedgekeurde merkgegevens.",
  },
  {
    n: "04",
    title: "Live",
    text: "Je gaat live en wij blijven betrokken via beheer.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-ivory">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="container-page flex flex-col justify-center py-14 lg:max-w-none lg:py-24 lg:pr-6 lg:pl-[max(2rem,calc((100vw-72rem)/2))]">
            <h1 className="font-heading text-[2.7rem] leading-[1.08] text-ink sm:text-5xl lg:text-[4.1rem]">
              Je bedrijf
              <br />
              staat ergens voor.
              <br />
              <em className="italic">Laat dat zien.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-olive">
              Kopvast helpt ondernemers hun bedrijf sterker naar buiten te zetten. Met een
              professionele website, een herkenbaar merk en middelen die bijdragen aan groei.
              Duidelijk, doeltreffend en goed geregeld.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/kansen">
                Bekijk je websitekansen
                <ArrowRight data-icon="inline-end" />
              </ButtonLink>
              <Link href="/websites" className="inline-flex items-center gap-1 border-b border-ink pb-0.5 text-sm text-ink">
                Bekijk wat je krijgt
              </Link>
            </div>
            <ul className="mt-8 flex flex-col gap-2 text-sm text-olive sm:flex-row sm:gap-6">
              {["Vaste prijzen", "Duidelijke afspraken", "Alles op één plek"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-ink" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[28rem] lg:min-h-[40rem]">
            <Image
              src="/images/hero.jpg"
              alt="Ondernemer in warm avondlicht, kijkend naar buiten"
              fill
              priority
              className="object-cover object-[50%_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
            <p className="font-hand absolute top-10 right-6 max-w-[11rem] text-right text-2xl leading-7 text-ivory md:right-10">
              Sterke bedrijven verdienen een uitstraling die klopt.
            </p>
            <p className="absolute right-6 bottom-6 text-xs tracking-[0.12em] text-ivory/80 uppercase md:right-10">
              Beeld voor sfeer · geen klantportret
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-stone/40 bg-ivory">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-20">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="group text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-stone/80 text-ink">
                <service.icon />
              </span>
              <h2 className="mt-5 font-heading text-2xl text-ink">{service.title}</h2>
              <p className="mt-2 text-sm leading-6 text-olive">{service.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-ink group-hover:underline">
                {service.linkLabel}
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-ink text-ivory">
        <div className="grid lg:grid-cols-2">
          <div className="container-page flex flex-col justify-center py-16 lg:max-w-none lg:py-24 lg:pr-10 lg:pl-[max(2rem,calc((100vw-72rem)/2))]">
            <p className="text-xs tracking-[0.18em] text-stone uppercase">Conceptvoorbeeld</p>
            <blockquote className="mt-5 font-heading text-3xl leading-snug md:text-4xl">
              “Een sterke locatiewebsite maakt in één oogopslag duidelijk wat de plek waard is, en hoe je
              een aanvraag doet.”
            </blockquote>
            <p className="mt-6 max-w-md text-sm leading-6 text-ivory/70">
              Dit is geen klantreview. Het is een concept voor zelfstandige trouw- en eventlocaties, de
              eerste doelgroep waarmee Kopvast het aanbod toetst.
            </p>
            <Link href="/resultaten" className="mt-6 inline-flex items-center gap-1 text-sm text-ivory">
              Bekijk dit concept
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative min-h-[26rem]">
            <Image
              src="/images/venue.jpg"
              alt="Landhuis aan het water, omgeven door bomen"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-ink/25" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-8 bg-ink/55 p-8 backdrop-blur-[2px] md:w-[15.5rem]">
              <Stat value={products.website.price} label="vaste websiteprijs" />
              <Stat value="6" label="kernpagina’s inbegrepen" />
              <Stat value={products.beheer.price} label="beheer per maand" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="container-page py-16 lg:max-w-none lg:py-24 lg:pr-8 lg:pl-[max(2rem,calc((100vw-72rem)/2))]">
            <p className="text-xs tracking-[0.18em] text-olive uppercase">Zo werkt Kopvast</p>
            <h2 className="mt-3 font-heading text-4xl leading-tight text-ink md:text-5xl">
              Van inzicht
              <br />
              naar resultaat.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-olive">
              We maken het je graag eenvoudig. In een helder proces werken we samen van analyse tot
              livegang en verder.
            </p>
            <Link href="/werkwijze" className="mt-6 inline-flex items-center gap-1 border-b border-ink pb-0.5 text-sm">
              Zo werkt het
            </Link>
            <ol className="mt-10 space-y-6">
              {steps.map((step) => (
                <li key={step.n} className="grid grid-cols-[auto_1fr] gap-4">
                  <span className="font-heading text-2xl text-copper">{step.n}</span>
                  <div>
                    <p className="font-medium text-ink">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-olive">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative min-h-[22rem] lg:min-h-full">
            <Image
              src="/images/desk.jpg"
              alt="Iemand werkt aan een plan aan een houten tafel"
              fill
              className="object-cover"
            />
            <p className="font-hand absolute right-6 bottom-8 max-w-[9rem] text-right text-2xl leading-7 text-ink">
              Scherp denken.
              <br />
              Sterk uitvoeren.
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-heading text-4xl text-ivory">{value}</p>
      <p className="mt-1 text-sm text-ivory/70">{label}</p>
    </div>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 20l4.5-1.2L19 8.3a1.8 1.8 0 0 0-2.5-2.6L6 16.2 4 20z" />
      <path d="M14.8 6.5l2.7 2.7" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 16l8 4 8-4" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2l-1.4 4.2-4.2 1.4 1.4-4.2 4.2-1.4z" />
    </svg>
  );
}
