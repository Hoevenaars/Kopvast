import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { workspaceRoutes } from "@/lib/product";
import { formatEuro, formatNlDateTime, proposalStatusLabel } from "@/lib/proposals";
import { loadProposals } from "@/lib/proposal-ops";

export const metadata: Metadata = {
  title: "Voorstellen",
  robots: { index: false, follow: false },
};

export default async function AdminProposalsPage() {
  const proposals = await loadProposals();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Voorstellen"
        title="Voorstellen"
        text="Van gekwalificeerde aanvraag naar een concreet voorstel en akkoord."
        action={
          <Link
            href={workspaceRoutes.adminProposalsNew}
            className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ivory"
          >
            Nieuw voorstel
          </Link>
        }
      />
      {proposals.length === 0 ? (
        <EmptyState title="Nog geen voorstellen" text="Maak een voorstel vanuit een aanvraag of vanaf een lege pagina." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone/50 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone/50 text-xs tracking-wide text-olive uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Nummer</th>
                <th className="px-4 py-3 font-medium">Klant</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Bedrag</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Versie</th>
                <th className="px-4 py-3 font-medium">Verzonden</th>
                <th className="px-4 py-3 font-medium">Laatst bekeken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`${workspaceRoutes.adminProposals}/${proposal.id}`} className="font-medium underline-offset-4 hover:underline">
                      {proposal.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-olive">{proposal.recipient_organization || proposal.recipient_name}</td>
                  <td className="px-4 py-3 text-olive">{proposal.type}</td>
                  <td className="px-4 py-3">{formatEuro(proposal.subtotal_cents)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={proposalStatusLabel(proposal.status)} tone={toneForStatus(proposal.status)} />
                  </td>
                  <td className="px-4 py-3">v{proposal.version}</td>
                  <td className="px-4 py-3 text-olive">{formatNlDateTime(proposal.sent_at)}</td>
                  <td className="px-4 py-3 text-olive">{formatNlDateTime(proposal.last_viewed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
