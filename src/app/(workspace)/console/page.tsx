import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { consoleNav, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { labelFor, projectStatuses, projectTypes, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Klantconsole",
  robots: { index: false, follow: false },
};

export default async function ConsoleHomePage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);

  return (
    <WorkspaceShell
      eyebrow="Klantconsole"
      title={workspace.organization.name}
      email={session.email}
      nav={consoleNav("overzicht")}
    >
      <p className="max-w-2xl text-sm leading-6 text-olive">
        Hier zie je wat er loopt, welke bestanden klaarstaan en of je nog een wijziging open hebt
        staan. Kopvast Beheer dekt twee kleine wijzigingen per maand.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Projecten" value={String(workspace.projects.length)} />
        <Metric label="Bestanden" value={String(workspace.assets.length)} />
        <Metric
          label="Open verzoeken"
          value={String(workspace.requests.filter((item) => item.status !== "klaar" && item.status !== "afgewezen").length)}
        />
      </div>
      <h2 className="mt-12 text-xl text-ink">Projecten</h2>
      {workspace.projects.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nog geen project" text="Zodra Kopvast start, zie je hier de status." />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {workspace.projects.map((project) => (
            <li key={project.id} className="rounded-2xl border border-stone/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[0.16em] text-olive uppercase">
                    {labelFor(projectTypes, project.type)}
                  </p>
                  <h3 className="mt-2 text-lg text-ink">{project.title}</h3>
                </div>
                <StatusBadge label={labelFor(projectStatuses, project.status)} tone={toneForStatus(project.status)} />
              </div>
              {project.summary ? <p className="mt-3 text-sm leading-6 text-olive">{project.summary}</p> : null}
              {project.price_label ? <p className="mt-3 text-sm text-ink">{project.price_label}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone/50 p-5">
      <p className="text-xs tracking-[0.16em] text-olive uppercase">{label}</p>
      <p className="mt-2 text-3xl text-ink">{value}</p>
    </div>
  );
}
