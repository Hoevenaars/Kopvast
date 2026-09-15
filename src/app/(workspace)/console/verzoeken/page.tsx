import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/workspace/request-form";
import { consoleNav, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { labelFor, requestStatuses, requestTypes, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Verzoeken",
  robots: { index: false, follow: false },
};

export default async function ConsoleRequestsPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);

  return (
    <WorkspaceShell
      eyebrow="Klantconsole"
      title="Wijzigingen en vragen"
      email={session.email}
      nav={consoleNav("verzoeken")}
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm leading-6 text-olive">
            Twee kleine wijzigingen per maand zitten in Kopvast Beheer. Grotere wensen zetten we als
            maatwerk uit.
          </p>
          <div className="mt-6">
            {workspace.requests.length === 0 ? (
              <EmptyState title="Nog geen verzoeken" text="Stuur hiernaast je eerste wijziging of vraag." />
            ) : (
              <ul className="space-y-3">
                {workspace.requests.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-stone/50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-olive">{labelFor(requestTypes, item.type)}</p>
                        <h2 className="mt-1 text-base text-ink">{item.title}</h2>
                      </div>
                      <StatusBadge label={labelFor(requestStatuses, item.status)} tone={toneForStatus(item.status)} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-olive">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <RequestForm />
      </div>
    </WorkspaceShell>
  );
}
