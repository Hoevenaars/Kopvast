import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ConceptApprovalForm,
  FinalApprovalForm,
  ProductionChangeForm,
} from "@/components/workspace/production-customer-forms";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { changeRequestStatuses, productionStatuses } from "@/lib/production";
import { labelFor, workspaceRoutes } from "@/lib/product";
import { loadProductionsForOrganization, loadProductionDetail } from "@/lib/production-board";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Goedkeuringen",
  robots: { index: false, follow: false },
};

export default async function CustomerApprovalsPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const [workspace, productions] = await Promise.all([
    loadCustomerWorkspace(session.organizationId),
    loadProductionsForOrganization(session.organizationId),
  ]);
  if (!workspace) redirect(workspaceRoutes.login);
  const owner = workspace.members.find((item) => item.email === session.email) ?? workspace.members[0];
  const defaultName = owner?.name || session.email;
  const details = (
    await Promise.all(productions.filter((item) => item.status !== "ready_for_production").map((item) => loadProductionDetail(item.id)))
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Goedkeuringen"
        title="Goedkeuringen"
        text="Hier geef je akkoord op het concept, geef je wijzigingen door en zet je het definitieve akkoord voor livegang."
      />
      {details.length === 0 ? (
        <EmptyState
          title="Nog niets ter review"
          text="Zodra Kopvast een preview klaarzet, zie je hier de concept-URL en de knoppen voor akkoord of wijzigingen."
        />
      ) : (
        <div className="space-y-10">
          {details.map((detail) => {
            const { production, changes, conceptApproval, finalApproval } = detail;
            const inReview = production.status === "client_review";
            const needsFinal = (production.status === "approved" || production.status === "ready_to_launch") && !finalApproval;
            return (
              <article key={production.id} className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-[0.16em] text-olive uppercase">{production.order}</p>
                    <h2 className="mt-2 text-xl font-semibold">{production.customer}</h2>
                  </div>
                  <StatusBadge label={labelFor(productionStatuses, production.status)} tone={toneForStatus(production.status)} />
                </div>
                {production.preview_url ? (
                  <div className="rounded-2xl border border-ink/10 bg-white p-5">
                    <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Concept</p>
                    <a
                      href={production.preview_url}
                      className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {production.preview_url}
                    </a>
                    {production.review_message ? (
                      <p className="mt-3 text-sm leading-6 text-ink/50">{production.review_message}</p>
                    ) : null}
                  </div>
                ) : null}
                {production.status === "live" ? (
                  <div className="rounded-2xl border border-ink/10 bg-white p-5">
                    <h3 className="text-lg font-semibold">Je website is live</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/50">
                      Live sinds {production.live_at ? new Date(production.live_at).toLocaleString("nl-NL") : "—"}.
                    </p>
                  </div>
                ) : null}
                {changes.length ? (
                  <ul className="space-y-3">
                    {changes.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-olive">{item.page_section}</p>
                            <p className="mt-1 text-sm leading-6">{item.body}</p>
                          </div>
                          <StatusBadge label={labelFor(changeRequestStatuses, item.status)} tone={toneForStatus(item.status)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {inReview ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ConceptApprovalForm productionId={production.id} defaultName={defaultName} />
                    <ProductionChangeForm productionId={production.id} />
                  </div>
                ) : null}
                {production.status === "changes" ? (
                  <p className="text-sm leading-6 text-ink/50">
                    We werken je wijzigingen af. Daarna sturen we het concept opnieuw ter review.
                  </p>
                ) : null}
                {needsFinal ? <FinalApprovalForm productionId={production.id} defaultName={defaultName} /> : null}
                {finalApproval ? (
                  <div className="rounded-2xl border border-ink/10 bg-white p-5">
                    <h3 className="text-lg font-semibold">Definitief akkoord vastgelegd</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/50">
                      {finalApproval.name} · {finalApproval.email} · {new Date(finalApproval.created_at).toLocaleString("nl-NL")}
                    </p>
                    {conceptApproval ? (
                      <p className="mt-2 text-sm text-ink/45">
                        Conceptakkoord van {conceptApproval.name} op {new Date(conceptApproval.created_at).toLocaleString("nl-NL")}.
                      </p>
                    ) : null}
                  </div>
                ) : conceptApproval && !inReview ? (
                  <p className="text-sm text-ink/50">
                    Conceptakkoord van {conceptApproval.name} op {new Date(conceptApproval.created_at).toLocaleString("nl-NL")}.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
