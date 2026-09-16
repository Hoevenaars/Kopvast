import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { ProjectPayment } from "@/components/workspace/project-payment";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { loadOrganizationBilling } from "@/lib/billing";
import { labelFor, projectStatuses, projectTypes, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Mijn website",
  robots: { index: false, follow: false },
};

export default async function CustomerWebsitePage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);
  const billing = await loadOrganizationBilling(workspace.organization.id);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Mijn website"
        title={workspace.organization.name}
        text="Status van je website en beheer. Inhoud pas je later aan via de pagina-onderdelen die Kopvast heeft bepaald."
      />
      {workspace.projects.length === 0 ? (
        <EmptyState title="Nog geen project" text="Zodra Kopvast start, zie je hier de status." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {workspace.projects.map((project) => (
            <li key={project.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[0.16em] text-olive uppercase">{labelFor(projectTypes, project.type)}</p>
                  <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
                </div>
                <StatusBadge label={labelFor(projectStatuses, project.status)} tone={toneForStatus(project.status)} />
              </div>
              {project.summary ? <p className="mt-3 text-sm leading-6 text-ink/50">{project.summary}</p> : null}
              {project.price_label ? <p className="mt-3 text-sm text-ink">{project.price_label}</p> : null}
              <ProjectPayment invoices={billing.invoices} recurring={billing.recurring} projectId={project.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
