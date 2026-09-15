import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { DataList, EmptyState } from "@/components/workspace/shell";
import { labelFor, organizationStatuses, workspaceRoutes } from "@/lib/product";
import { loadOrganizations } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Klanten",
  robots: { index: false, follow: false },
};

export default async function AdminCustomersPage() {
  const organizations = await loadOrganizations();

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Klanten" title="Klanten" text="Gewonnen aanvragen die je hebt omgezet naar een omgeving." />
      {organizations.length === 0 ? (
        <EmptyState title="Nog geen klanten" text="Zet een aanvraag om zodra je start." />
      ) : (
        <DataList
          items={organizations.map((org) => ({
            href: `${workspaceRoutes.adminCustomers}/${org.id}`,
            title: org.name,
            meta: `${labelFor(organizationStatuses, org.status)}${org.website ? ` · ${org.website}` : ""}`,
            extra: new Date(org.created_at).toLocaleDateString("nl-NL"),
          }))}
        />
      )}
    </div>
  );
}
