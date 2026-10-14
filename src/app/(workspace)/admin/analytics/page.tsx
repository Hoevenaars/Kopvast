import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { listAanvragen } from "@/lib/aanvragen";
import { bronLabel } from "@/lib/aanvragen-model";
import { interestSubjects, summarizeRequests } from "@/lib/interest";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

function subjectLabel(value: string) {
  return interestSubjects.find((item) => item.value === value)?.label ?? value;
}

export default async function AdminAnalyticsPage() {
  const { items, configured } = await listAanvragen();
  const summary = summarizeRequests(items);

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow="Analytics"
        title="Aanvragen"
        text="Cijfers uit de bestaande aanvragen. Geen bezoekersaantallen: daarvoor is geen toestemmingsvrije meting ingericht."
      />
      {configured ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              ["Aanvragen", summary.total],
              ["Met voorstel", summary.proposals],
              ["Voorstel geaccepteerd", summary.accepted],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-ink/10 bg-white p-5">
                <p className="text-sm text-ink/45">{label}</p>
                <p className="mt-4 text-3xl font-semibold">{value}</p>
              </article>
            ))}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <CountList title="Per dienst" rows={Object.entries(summary.bySubject)} labelFor={subjectLabel} />
            <CountList title="Per bron" rows={Object.entries(summary.bySource)} labelFor={bronLabel} />
          </section>
        </>
      ) : (
        <p className="max-w-xl text-sm leading-6 text-ink/60">
          De aanvraagadministratie is in deze omgeving niet gekoppeld. Er worden geen cijfers getoond.
        </p>
      )}
    </div>
  );
}

function CountList({
  title,
  rows,
  labelFor,
}: {
  title: string;
  rows: Array<[string, number]>;
  labelFor: (value: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white">
      <h2 className="border-b border-ink/8 px-5 py-4 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink/45">Nog geen aanvragen.</p>
      ) : (
        <ul className="divide-y divide-ink/6">
          {rows.map(([key, count]) => (
            <li key={key} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{labelFor(key)}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
