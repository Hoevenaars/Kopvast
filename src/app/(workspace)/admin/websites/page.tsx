import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { labelFor, projectStatuses, workspaceRoutes } from "@/lib/product";
import { formatDateNl } from "@/lib/sites";
import { loadWebsiteCatalog } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Websites",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitesPage() {
  const websites = await loadWebsiteCatalog();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Websites"
        title="Websites"
        text="Live en in-bouw sites van klanten. Geen deploy-console: klant, domein, beheer en open support."
      />
      {websites.length === 0 ? (
        <EmptyState title="Nog geen websites" text="Zet een gewonnen aanvraag om naar een klant. Dan verschijnt hier een website-record." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="hidden gap-3 border-b border-ink/8 px-5 py-3 text-[11px] font-semibold tracking-[0.14em] text-ink/35 uppercase md:grid md:grid-cols-[1.3fr_1fr_7rem_7rem_7rem_6rem_1fr]">
            <span>Klant</span>
            <span>Domein</span>
            <span>Status</span>
            <span>Live sinds</span>
            <span>Beheer</span>
            <span>Support</span>
            <span>Volgende actie</span>
          </div>
          <ul className="divide-y divide-ink/8">
            {websites.map((site) => (
              <li key={site.id}>
                <Link
                  href={`${workspaceRoutes.adminWebsites}/${site.id}`}
                  className="grid gap-2 px-5 py-4 transition hover:bg-[#F8F6F1] md:grid-cols-[1.3fr_1fr_7rem_7rem_7rem_6rem_1fr] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">{site.customerName}</p>
                    <p className="mt-1 text-xs text-ink/45 md:hidden">{site.domain}</p>
                  </div>
                  <p className="hidden text-sm text-ink/70 md:block">{site.domain}</p>
                  <StatusBadge label={labelFor(projectStatuses, site.status)} tone={toneForStatus(site.status)} />
                  <p className="text-sm text-ink/55">{formatDateNl(site.liveAt)}</p>
                  <p className="text-sm font-semibold">{site.beheerActive ? "Actief" : "Niet actief"}</p>
                  <p className="text-sm">{site.openSupport || "—"}</p>
                  <p className={site.health.needsAction ? "text-sm font-semibold text-copper-dark" : "text-sm text-olive"}>
                    {site.health.label}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
