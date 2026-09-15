import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/workspace/request-form";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { labelFor, requestStatuses, requestTypes, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Wijzigingen",
  robots: { index: false, follow: false },
};

export default async function CustomerChangesPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Wijzigingen"
        title="Wijzigingen en vragen"
        text="Twee kleine wijzigingen per maand zitten in Kopvast Beheer. Grotere wensen zetten we als maatwerk uit."
      />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {workspace.requests.length === 0 ? (
            <EmptyState title="Nog geen verzoeken" text="Stuur hiernaast je eerste wijziging of vraag." />
          ) : (
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
                </li>
              ))}
            </ul>
          )}
        </div>
        <RequestForm />
      </div>
    </div>
  );
}
