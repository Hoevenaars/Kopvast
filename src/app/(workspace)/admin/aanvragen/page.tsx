import type { Metadata } from "next";
import { adminNav, DataList, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { labelFor, leadStatuses, workspaceRoutes } from "@/lib/product";
import { loadLeads } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Aanvragen",
  robots: { index: false, follow: false },
};

export default async function AdminLeadsPage() {
  const session = await requireSession("admin");
  const leads = await loadLeads();

  return (
    <WorkspaceShell
      eyebrow="Adminconsole"
      title="Aanvragen"
      email={session?.email ?? ""}
      nav={adminNav("aanvragen")}
    >
      {leads.length === 0 ? (
        <EmptyState title="Leeg" text="Nieuwe website- of maatwerkaanvragen komen hier binnen." />
      ) : (
        <DataList
          items={leads.map((lead) => ({
            href: `${workspaceRoutes.adminLeads}/${lead.id}`,
            title: lead.company_name || lead.name,
            meta: `${lead.name} · ${lead.email} · ${labelFor(leadStatuses, lead.status)}`,
            extra: new Date(lead.created_at).toLocaleDateString("nl-NL"),
          }))}
        />
      )}
    </WorkspaceShell>
  );
}
