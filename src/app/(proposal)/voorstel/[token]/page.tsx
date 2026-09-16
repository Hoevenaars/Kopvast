import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposal-document";
import { ProposalResponse } from "@/app/(proposal)/voorstel/[token]/proposal-response";
import { readSession } from "@/lib/auth";
import { loadPublicProposal, recordProposalView } from "@/lib/proposal-ops";
import { formatEuro } from "@/lib/proposals";

export const metadata: Metadata = {
  title: "Voorstel",
  robots: { index: false, follow: false },
};

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const publicProposal = await loadPublicProposal(token);
  if (!publicProposal) notFound();
  const session = await readSession();
  const admin = session?.role === "admin";
  await recordProposalView(token, { admin });
  const snapshot = publicProposal.snapshot;
  const accepted = publicProposal.proposal.status === "ACCEPTED";
  const banner = publicProposal.current
    ? accepted
      ? `Akkoord ontvangen${publicProposal.proposal.accepted_at ? ` op ${new Date(publicProposal.proposal.accepted_at).toLocaleDateString("nl-NL")}` : ""}.`
      : null
    : "Dit is een eerdere versie van het voorstel.";

  return (
    <main className="container-page max-w-3xl space-y-10 py-10 md:py-16">
      <ProposalDocument snapshot={snapshot} banner={banner} />
      <section className="space-y-4 pb-16">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Acties</h2>
        <p className="text-sm text-olive">
          {snapshot.organization} · {snapshot.number} · {formatEuro(snapshot.totals.subtotalCents)} excl. btw
        </p>
        <ProposalResponse
          token={token}
          organization={snapshot.organization}
          number={snapshot.number}
          amountCents={snapshot.totals.subtotalCents}
          name={snapshot.recipientName}
          email={snapshot.recipientEmail}
          accepted={accepted}
          current={publicProposal.current}
        />
      </section>
    </main>
  );
}
