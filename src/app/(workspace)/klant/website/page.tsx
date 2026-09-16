import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { labelFor, projectStatuses, projectTypes, workspaceRoutes } from "@/lib/product";
import { loadProductionsForOrganization } from "@/lib/production-board";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Mijn website",
  robots: { index: false, follow: false },
};

export default async function CustomerWebsitePage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const [workspace, productions] = await Promise.all([
    loadCustomerWorkspace(session.organizationId),
    loadProductionsForOrganization(session.organizationId),
  ]);
  if (!workspace) redirect(workspaceRoutes.login);

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
          {workspace.projects.map((project) => {
            const production = productions.find((item) => item.project_id === project.id);
            const href =
              project.status === "live"
                ? asExternalUrl(workspace.organization.website) || asExternalUrl(production?.preview_url)
                : asExternalUrl(production?.preview_url);
            return (
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
                {href ? (
                  <a href={href} className="mt-3 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
                    {project.status === "live" ? "Open live website" : "Open preview"}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function asExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
