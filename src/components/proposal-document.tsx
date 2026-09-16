import { products } from "@/lib/site";
import { termsSections } from "@/lib/terms";

export type ProposalDocumentSnapshot = {
  number: string;
  version: number;
  title: string;
  intro: string;
  aanleiding: string;
  scopeSummary: string;
  planning: string;
  validity: string;
  terms: string;
  organization: string;
  recipientName: string;
  lines: Array<{
    id: string;
    kind: string;
    title: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    amountCents: number;
  }>;
  totals: {
    subtotalCents: number;
    vatCents: number;
    totalCents: number;
    recurringMonthlyCents: number;
    recurringVatCents: number;
    vatRate: number;
  };
};

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function ProposalDocument({
  snapshot,
  banner,
}: {
  snapshot: ProposalDocumentSnapshot;
  banner?: string | null;
}) {
  const scope = snapshot.lines.filter((line) => line.kind === "scope");
  const recurring = snapshot.lines.filter((line) => line.kind === "recurring");
  const sections = termsSections();

  return (
    <article className="space-y-10">
      {banner ? (
        <p className="rounded-xl border border-copper/30 bg-copper/10 px-4 py-3 text-sm text-copper-dark">{banner}</p>
      ) : null}
      <header className="space-y-3">
        <p className="text-xs tracking-[0.22em] text-olive uppercase">Kopvast</p>
        <h1 className="font-heading text-4xl leading-[1.12] text-ink md:text-5xl">{snapshot.title}</h1>
        <p className="text-sm text-olive">
          {snapshot.number} · v{snapshot.version} · {snapshot.organization}
        </p>
      </header>

      {snapshot.intro ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Intro</h2>
          <p className="whitespace-pre-wrap text-base leading-7 text-ink">{snapshot.intro}</p>
        </section>
      ) : null}

      {snapshot.aanleiding ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Aanleiding</h2>
          <p className="whitespace-pre-wrap text-base leading-7 text-olive">{snapshot.aanleiding}</p>
        </section>
      ) : null}

      {snapshot.scopeSummary ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Wat maken we</h2>
          <p className="whitespace-pre-wrap text-base leading-7 text-ink">{snapshot.scopeSummary}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Scope</h2>
        <ul className="divide-y divide-stone/50 rounded-2xl border border-stone/60 bg-white">
          {scope.map((line) => (
            <li key={line.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-medium text-ink">{line.title}</p>
                {line.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-olive">{line.description}</p> : null}
                <p className="mt-1 text-xs text-olive">
                  {line.quantity} × {euro(line.unitPriceCents)}
                </p>
              </div>
              <p className="text-sm font-medium text-ink">{euro(line.amountCents)}</p>
            </li>
          ))}
        </ul>
      </section>

      {snapshot.planning ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Planning</h2>
          <p className="whitespace-pre-wrap text-base leading-7 text-olive">{snapshot.planning}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Investering</h2>
        <div className="rounded-2xl border border-stone/60 bg-white px-5 py-4 text-sm">
          <Row label="Subtotaal excl. btw" value={euro(snapshot.totals.subtotalCents)} />
          <Row label={`Btw ${Math.round(snapshot.totals.vatRate * 100)}%`} value={euro(snapshot.totals.vatCents)} />
          <Row label="Totaal incl. btw" value={euro(snapshot.totals.totalCents)} strong />
        </div>
      </section>

      {recurring.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Beheer</h2>
          <ul className="divide-y divide-stone/50 rounded-2xl border border-stone/60 bg-white">
            {recurring.map((line) => (
              <li key={line.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-ink">{line.title}</p>
                  {line.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-olive">{line.description}</p> : null}
                </div>
                <p className="text-sm font-medium text-ink">{euro(line.amountCents)} / maand excl. btw</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-olive">
            Maandelijks {euro(snapshot.totals.recurringMonthlyCents)} excl. btw, {euro(snapshot.totals.recurringVatCents)}{" "}
            btw. {products.beheer.name} start na livegang.
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Voorwaarden en geldigheid</h2>
        {snapshot.validity ? <p className="text-base leading-7 text-ink">{snapshot.validity}</p> : null}
        <div className="space-y-4 rounded-2xl border border-stone/60 bg-[#f7f4ec] p-5 text-sm leading-6 text-olive">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="font-medium text-ink">{section.title}</p>
              <p className="mt-1">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone/40 py-2 last:border-0">
      <span className={strong ? "font-medium text-ink" : "text-olive"}>{label}</span>
      <span className={strong ? "font-medium text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
