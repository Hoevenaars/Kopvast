import type { Metadata } from "next";
import { adminNav, DataList, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { labelFor, leadStatuses, organizationStatuses, workspaceRoutes } from "@/lib/product";
import { loadAdminOverview } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Adminconsole",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const session = await requireSession("admin");
  const overview = await loadAdminOverview();

  return (
    <WorkspaceShell
      eyebrow="Adminconsole"
      title="Wat er nu speelt"
      email={session?.email ?? ""}
      nav={adminNav("overzicht")}
    >
      {!overview ? (
        <EmptyState
          title="Geen verbinding met Website Refresh"
          text="Zet WEBSITE_REFRESH_SERVICE_ROLE_KEY in de omgeving. Zonder die sleutel blijft de publieke site werken, maar deze console niet."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Aanvragen" value={String(overview.leadCount)} />
            <Metric label="Actieve klanten" value={String(overview.customerCount)} />
            <Metric label="Open verzoeken" value={String(overview.openRequests)} />
          </div>
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="text-xl text-ink">Recente aanvragen</h2>
              <div className="mt-4">
                {overview.leads.length === 0 ? (
                  <EmptyState title="Nog geen aanvragen" text="Nieuwe formulieren landen hier." />
                ) : (
                  <DataList
                    items={overview.leads.map((lead) => ({
                      href: `${workspaceRoutes.adminLeads}/${lead.id}`,
                      title: lead.company_name || lead.name,
                      meta: `${lead.name} · ${labelFor(leadStatuses, lead.status)}`,
                      extra: lead.type,
                    }))}
                  />
                )}
              </div>
            </section>
            <section>
              <h2 className="text-xl text-ink">Klanten</h2>
              <div className="mt-4">
                {overview.organizations.length === 0 ? (
                  <EmptyState title="Nog geen klanten" text="Zet een gewonnen aanvraag om naar een klant." />
                ) : (
                  <DataList
                    items={overview.organizations.map((org) => ({
                      href: `${workspaceRoutes.adminCustomers}/${org.id}`,
                      title: org.name,
                      meta: labelFor(organizationStatuses, org.status),
                      extra: org.website ?? undefined,
                    }))}
                  />
                )}
              </div>
            </section>
          </div>
          <section className="mt-12">
            <h2 className="text-xl text-ink">Kopvast-prospects</h2>
            <p className="mt-2 text-sm text-olive">Websitechecks en aanvragen die intern in Website Refresh staan.</p>
            <div className="mt-4">
              {overview.prospects.length === 0 ? (
                <EmptyState title="Nog geen prospects" text="Een websitecheck of aanvraag met website komt hier." />
              ) : (
                <DataList
                  items={overview.prospects.map((item) => ({
                    title: item.company_name || item.domain,
                    meta: `${item.domain} · ${item.status}`,
                    extra: item.opportunity_score != null ? `Score ${item.opportunity_score}` : undefined,
                  }))}
                />
              )}
            </div>
          </section>
        </>
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
