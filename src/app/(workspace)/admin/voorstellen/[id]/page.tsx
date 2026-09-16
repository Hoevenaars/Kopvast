import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalEditor } from "@/app/(workspace)/admin/voorstellen/editor";
import { PageIntro } from "@/components/workspace/page-frame";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { workspaceRoutes } from "@/lib/product";
import { formatNlDateTime, proposalPublicPath, proposalStatusLabel } from "@/lib/proposals";
import { loadProposal } from "@/lib/proposal-ops";

export const metadata: Metadata = {
  title: "Voorstel",
  robots: { index: false, follow: false },
};

export default async function AdminProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadProposal(id);
  if (!detail) notFound();
  const { proposal, lines, versions, activity } = detail;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Voorstel"
        title={proposal.title || proposal.number}
        text={`${proposal.number} · ${proposal.recipient_organization || proposal.recipient_name}`}
        action={
          <Link
            href={`${workspaceRoutes.adminProposals}/${proposal.id}/preview`}
            className="inline-flex items-center justify-center rounded-md border border-stone px-4 py-3 text-sm"
          >
            Preview
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={proposalStatusLabel(proposal.status)} tone={toneForStatus(proposal.status)} />
        <p className="text-sm text-olive">v{proposal.version}</p>
        {proposal.current_token ? (
          <Link href={proposalPublicPath(proposal.current_token)} className="text-sm underline underline-offset-4">
            Publieke link
          </Link>
        ) : null}
      </div>
      {proposal.question_text ? (
        <div className="rounded-2xl border border-copper/30 bg-copper/10 p-5 text-sm">
          <p className="font-medium text-copper-dark">Vraag van de klant</p>
          <p className="mt-2 whitespace-pre-wrap text-ink">{proposal.question_text}</p>
        </div>
      ) : null}
      <ProposalEditor proposal={proposal} lines={lines} versions={versions} />
      <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <h2 className="font-semibold">Versies</h2>
        {versions.length === 0 ? (
          <p className="mt-3 text-sm text-olive">Nog niet verzonden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone/40">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  v{version.version}
                  {version.version === proposal.version ? " · actueel" : ""}
                </span>
                <span className="text-olive">{formatNlDateTime(version.sent_at)}</span>
                <Link href={proposalPublicPath(version.token)} className="underline underline-offset-4">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <h2 className="font-semibold">Activiteit</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-olive">Nog geen gebeurtenissen.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone/40">
            {activity.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>{labelForActivity(item.event_type)}</span>
                <span className="text-olive">{formatNlDateTime(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function labelForActivity(eventType: string) {
  if (eventType.includes("created")) return "Aangemaakt";
  if (eventType.includes("saved")) return "Opgeslagen";
  if (eventType.includes("sent")) return "Verzonden";
  if (eventType.includes("viewed")) return "Bekeken";
  if (eventType.includes("question")) return "Vraag";
  if (eventType.includes("accepted")) return "Akkoord";
  if (eventType.includes("handoff")) return "Doorgezet naar klant";
  return eventType;
}
