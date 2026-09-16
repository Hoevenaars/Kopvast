import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalEditor } from "../proposal-editor";
import { PageIntro } from "@/components/workspace/page-frame";
import { loadProposal } from "@/lib/aanvragen";
import { labelForFit } from "@/lib/acquisition-constants";
import { workspaceRoutes } from "@/lib/product";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const proposal = await loadProposal(id);
  return { title: proposal?.title || "Voorstel", robots: { index: false, follow: false } };
}

export default async function VoorstelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await loadProposal(id);
  if (!proposal) notFound();

  const customFit = proposal.product_fit === "CUSTOM_FIT";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageIntro
        eyebrow={proposal.status}
        title={proposal.title}
        text={labelForFit(proposal.product_fit)}
        action={
          proposal.aanvraag ? (
            <Link
              href={`${workspaceRoutes.adminAanvragen}/${proposal.aanvraag.id}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Terug naar aanvraag
            </Link>
          ) : null
        }
      />
      <ProposalEditor
        proposalId={proposal.id}
        leadId={proposal.inbound_lead_id}
        title={proposal.title}
        notes={proposal.notes ?? ""}
        lines={proposal.lines}
        customFit={customFit}
      />
    </div>
  );
}
