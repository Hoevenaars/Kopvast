import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/workspace/request-form";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { changeRequestStatuses } from "@/lib/production";
import { labelFor, requestStatuses, requestTypes, workspaceRoutes } from "@/lib/product";
import { loadProductionsForOrganization, loadProductionDetail } from "@/lib/production-board";
import { customerWebsiteOptions } from "@/lib/sites";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Wijzigingen",
  robots: { index: false, follow: false },
};

export default async function CustomerChangesPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const [workspace, productions] = await Promise.all([
    loadCustomerWorkspace(session.organizationId),
    loadProductionsForOrganization(session.organizationId),
  ]);
  if (!workspace) redirect(workspaceRoutes.login);
  const reviewChanges = (
    await Promise.all(productions.map((item) => loadProductionDetail(item.id)))
  ).flatMap((detail) => detail?.changes ?? []);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Wijzigingen"
        title="Wijzigingen en vragen"
        text="Twee kleine wijzigingen per maand zitten in Kopvast Beheer. Grotere wensen zetten we als maatwerk uit."
      />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {reviewChanges.length ? (
            <div className="mb-8 space-y-3">
              <h2 className="text-lg font-semibold">Reviewwijzigingen</h2>
              <ul className="space-y-3">
                {reviewChanges.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-olive">{item.page_section}</p>
                        <h2 className="mt-1 text-base font-semibold">{item.body}</h2>
                      </div>
                      <StatusBadge label={labelFor(changeRequestStatuses, item.status)} tone={toneForStatus(item.status)} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {workspace.requests.length === 0 && reviewChanges.length === 0 ? (
            <EmptyState title="Nog geen verzoeken" text="Stuur hiernaast je eerste wijziging of vraag." />
          ) : workspace.requests.length === 0 ? null : (
            <ul className="space-y-3">
              {workspace.requests.map((item) => (
                <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-olive">{labelFor(requestTypes, item.type)}</p>
                      <h2 className="mt-1 text-base font-semibold">{item.title}</h2>
                    </div>
                    <StatusBadge label={labelFor(requestStatuses, item.status)} tone={toneForStatus(item.status)} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/50">{item.body}</p>
                  {item.file_name ? <p className="mt-2 text-xs text-ink/45">Bijlage: {item.file_name}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <RequestForm websites={customerWebsiteOptions(workspace.projects, workspace.organization)} />
      </div>
    </div>
  );
}
