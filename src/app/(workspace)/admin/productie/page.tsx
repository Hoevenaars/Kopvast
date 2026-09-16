import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { formatDueLabel, productionStatuses } from "@/lib/production";
import { labelFor, workspaceRoutes } from "@/lib/product";
import { loadProductionBoard } from "@/lib/production-board";

export const metadata: Metadata = {
  title: "Productie",
  robots: { index: false, follow: false },
};

export default async function AdminProductionPage() {
  const board = await loadProductionBoard();
  const activeCount = board.items.filter((item) => item.status !== "live").length;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Productie"
        title="Productie"
        text="Van afgeronde onboarding naar een gecontroleerde live website. Geen projectmanagement, wel status, review en livegang."
      />
      {activeCount === 0 && board.live.length === 0 ? (
        <EmptyState
          title="Nog geen productie"
          text="Zet een gewonnen aanvraag om naar een klant. Website- en maatwerkopdrachten verschijnen hier."
        />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4 px-1">
            {board.columns.map((column) => (
              <section key={column.value} className="w-[17.5rem] shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <span className="text-xs text-ink/40">{column.items.length}</span>
                </div>
                {column.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone/70 p-4">
                    <p className="text-sm text-ink/40">Leeg</p>
                  </div>
                ) : (
                  column.items.map((item) => <ProductionCardLink key={item.id} item={item} />)
                )}
              </section>
            ))}
          </div>
        </div>
      )}
      {board.live.length ? (
        <section className="space-y-3">
          <h2 className="text-xl text-ink">Live</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {board.live.map((item) => (
              <li key={item.id}>
                <ProductionCardLink item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProductionCardLink({
  item,
}: {
  item: Awaited<ReturnType<typeof loadProductionBoard>>["items"][number];
}) {
  return (
    <Link
      href={`${workspaceRoutes.adminProductie}/${item.id}`}
      className="block rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-ink/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{item.customer}</p>
          <p className="mt-1 text-sm text-ink/50">{item.order}</p>
        </div>
        <StatusBadge label={labelFor(productionStatuses, item.status)} tone={toneForStatus(item.status)} />
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Datum" value={formatDueLabel(item.due_at)} />
        <Row label="Volgende actie" value={item.next_action || "—"} />
        <Row label="Blockers" value={item.blockers || "Geen"} />
      </dl>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink/40">{label}</dt>
      <dd className="max-w-[11rem] text-right text-ink">{value}</dd>
    </div>
  );
}
