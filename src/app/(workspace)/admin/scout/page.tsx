import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { PendingLink } from "@/components/workspace/pending-nav";
import { formatNlDate } from "@/lib/acquisition-constants";
import { workspaceRoutes } from "@/lib/product";
import { listAdminScoutCaptures, scoutSourceLabel } from "@/lib/scout/crm";
import { SCOUT_STATUS_LABELS } from "@/lib/scout/types";

export const metadata: Metadata = { title: "Scout", robots: { index: false, follow: false } };

export default async function AdminScoutPage() {
  const items = await listAdminScoutCaptures();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Scout"
        title="Scout"
        text="Alles wat je vanaf de iPhone pusht. Notitie, scan en concept staan ook op de prospect in Acquisitie. Er gaat nooit automatisch mail de deur uit."
        action={
          <Link
            href={workspaceRoutes.adminAcquisition}
            className="inline-flex h-12 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold"
          >
            Naar acquisitie
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nog geen Scout-pushes"
          text="Open scout.kopvast.nl op je telefoon, plak een website en druk op Push. De lead verschijnt hier."
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => {
            const href = item.prospect_id
              ? `${workspaceRoutes.adminAcquisition}/${item.prospect_id}`
              : workspaceRoutes.adminScout;
            return (
              <li key={item.id}>
                <PendingLink
                  href={href}
                  pendingLabel="Prospect openen…"
                  className="block rounded-2xl border border-ink/10 bg-white p-5 transition hover:bg-[#F8F6F1]"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-copper-dark uppercase">Scout</p>
                      <h2 className="mt-1 text-lg font-semibold">{item.company_name || item.domain}</h2>
                      <p className="text-sm text-ink/45">{item.domain}</p>
                      {item.note ? <p className="mt-2 text-sm text-ink/70">{item.note}</p> : null}
                    </div>
                    <p className="text-xs text-ink/40">{formatNlDate(item.created_at)}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                    <Meta label="Status" value={SCOUT_STATUS_LABELS[item.status]} />
                    <Meta label="Score" value={item.score == null ? "—" : `${item.score} / 100`} />
                    <Meta label="Bron" value={scoutSourceLabel(item.source)} />
                    <Meta label="E-mail" value={item.email || "Geen e-mail"} />
                    <Meta label="Concept" value={item.draft_status ? (item.draft_status === "approved" ? "Goedgekeurd" : "Klaar") : "Nog niet"} />
                  </dl>
                </PendingLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
