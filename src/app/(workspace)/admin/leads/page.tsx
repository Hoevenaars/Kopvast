import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { DataList, EmptyState } from "@/components/workspace/shell";
import { labelFor, leadStatuses, workspaceRoutes } from "@/lib/product";
import { loadLeads } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function AdminLeadsPage() {
  const leads = await loadLeads();

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Leads" title="Aanvragen" text="Website- en maatwerkaanvragen die via kopvast.nl binnenkomen." />
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
    </div>
  );
}
