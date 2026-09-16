import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposal-document";
import { workspaceRoutes } from "@/lib/product";
import { currentVersionOf, loadProposal } from "@/lib/proposal-ops";
import { snapshotContent } from "@/lib/proposals";

export const metadata: Metadata = {
  title: "Voorstelpreview",
  robots: { index: false, follow: false },
};

export default async function AdminProposalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadProposal(id);
  if (!detail) notFound();
  const sent = currentVersionOf(detail)?.snapshot;
  const draft = snapshotContent({
    number: detail.proposal.number,
    version: detail.proposal.version,
    type: detail.proposal.type,
    title: detail.proposal.title,
    intro: detail.proposal.intro,
    aanleiding: detail.proposal.aanleiding,
    scopeSummary: detail.proposal.scope_summary,
    planning: detail.proposal.planning,
    validity: detail.proposal.validity_text,
    organization: detail.proposal.recipient_organization,
    recipientName: detail.proposal.recipient_name,
    recipientEmail: detail.proposal.recipient_email,
    lines: detail.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      title: line.title,
      description: line.description,
      quantity: Number(line.quantity),
      unitPriceCents: line.unit_price_cents,
    })),
    sentAt: detail.proposal.sent_at || new Date().toISOString(),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`${workspaceRoutes.adminProposals}/${id}`} className="text-sm underline underline-offset-4">
          Terug naar editor
        </Link>
        <p className="text-sm text-olive">Adminpreview telt niet als klantweergave.</p>
      </div>
      <ProposalDocument snapshot={draft} banner="Conceptpreview. Dit is niet de klantlink." />
      {sent && sent.version === draft.version ? null : sent ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-sm font-medium text-ink">Laatst verzonden versie (v{sent.version})</p>
          <div className="mt-6">
            <ProposalDocument snapshot={sent} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
