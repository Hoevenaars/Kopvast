import type { Metadata } from "next";
import { adminNav, DataList, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { labelFor, organizationStatuses, workspaceRoutes } from "@/lib/product";
import { loadOrganizations } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Klanten",
  robots: { index: false, follow: false },
};

export default async function AdminCustomersPage() {
  const session = await requireSession("admin");
  const organizations = await loadOrganizations();

  return (
    <WorkspaceShell
      eyebrow="Adminconsole"
      title="Klanten"
      email={session?.email ?? ""}
      nav={adminNav("klanten")}
    >
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
    </WorkspaceShell>
  );
}
