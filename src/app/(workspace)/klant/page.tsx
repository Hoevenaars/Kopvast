import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FilePenLine, Globe2, ImageIcon, Palette } from "lucide-react";
import type { ElementType } from "react";
import { PageIntro } from "@/components/workspace/page-frame";
import { customerHomeMock } from "@/lib/console-ui";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Mijn Kopvast",
  robots: { index: false, follow: false },
};

const actions: Array<{ title: string; description: string; href: string; icon: ElementType }> = [
  { title: "Tekst aanpassen", description: "Wijzig teksten op je website.", href: "/klant/paginas", icon: FilePenLine },
  { title: "Afbeelding vervangen", description: "Beheer foto's en afbeeldingen.", href: workspaceRoutes.consoleFiles, icon: ImageIcon },
  { title: "Wijziging aanvragen", description: "Vraag Kopvast om iets aan te passen.", href: workspaceRoutes.consoleRequests, icon: ArrowRight },
  { title: "Mijn merk", description: "Bekijk kleuren, logo's en bestanden.", href: "/klant/merk", icon: Palette },
];

export default function CustomerDashboard() {
  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Mijn Kopvast"
        title="Welkom"
        text="Beheer je website, merk en middelen vanuit één omgeving."
      />

      <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-md bg-ivory">
              <Globe2 className="size-6 text-olive" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{customerHomeMock.website}</h2>
                <span className="rounded-full bg-[#E8EFE5] px-2.5 py-1 text-[11px] font-semibold text-[#4D6748]">
                  {customerHomeMock.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/45">Laatste update {customerHomeMock.updated}</p>
            </div>
          </div>
          <Link
            href={workspaceRoutes.consoleWebsite}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-ink/90"
          >
            Website bekijken
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Actie nodig</div>
        {customerHomeMock.attention.length === 0 ? (
          <>
            <h2 className="mt-3 text-lg font-semibold">Niets te doen</h2>
            <p className="mt-2 text-sm leading-6 text-ink/50">Er staan geen goedkeuringen of openstaande verzoeken klaar.</p>
          </>
        ) : (
          <ul className="mt-4 space-y-3">
            {customerHomeMock.attention.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className="flex items-center justify-between gap-3 text-sm font-semibold">
                  {item.title}
                  <ArrowRight className="size-4 text-ink/30" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Snelle acties</h2>
          <p className="text-sm text-ink/45">De meest gebruikte onderdelen van je omgeving.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((item) => (
            <QuickAction key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Website</div>
          <h3 className="mt-3 text-lg font-semibold">Je website is live</h3>
          <p className="mt-2 text-sm leading-6 text-ink/50">Je website is gepubliceerd en wordt beheerd door Kopvast.</p>
          <div className="mt-5 flex items-center justify-between border-t border-ink/7 pt-4">
            <span className="text-sm text-ink/45">Status</span>
            <span className="text-sm font-semibold text-olive">Alles in orde</span>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Beheer</div>
          <h3 className="mt-3 text-lg font-semibold">Kopvast Beheer</h3>
          <p className="mt-2 text-sm leading-6 text-ink/50">
            Onderhoud, monitoring en kleine wijzigingen worden voor je geregeld.
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-ink/7 pt-4">
            <span className="text-sm text-ink/45">Abonnement</span>
            <span className="text-sm font-semibold">{customerHomeMock.beheerActive ? "Actief" : "Niet actief"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Recente wijzigingen</div>
        <ul className="mt-4 divide-y divide-ink/8">
          {customerHomeMock.recentChanges.map((item) => (
            <li key={item.title} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-ink/45">{item.date}</p>
              </div>
              <span className="text-sm font-semibold text-olive">{item.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-ink/10 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-ink/20"
    >
      <div className="flex size-10 items-center justify-center rounded-md bg-ivory text-olive">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-ink/45">{description}</p>
      <ArrowRight className="mt-5 size-4 text-ink/30 transition group-hover:translate-x-1 group-hover:text-ink" />
    </Link>
  );
}
