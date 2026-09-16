import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { customerTabs, isCustomerTab } from "@/lib/customers";
import { loadCustomerDossier } from "@/lib/customer-dossier";
import { loadOnboardingsForOrganization } from "@/lib/onboarding-store";
import { loadOrdersForOrganization } from "@/lib/order-ops";
import { workspaceRoutes } from "@/lib/product";
import { loadProductionsForOrganization } from "@/lib/production-board";
import { cn } from "@/lib/utils";
import {
  ActivityPanel,
  BrandPanel,
  ContactPanel,
  FilesPanel,
  InvoicesPanel,
  LeadsPanel,
  OrdersPanel,
  OverviewPanel,
  ProposalsPanel,
  RequestsPanel,
  WebsitePanel,
} from "./panels";

export const metadata: Metadata = {
  title: "Klant",
  robots: { index: false, follow: false },
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = tabParam && isCustomerTab(tabParam) ? tabParam : "overzicht";
  const dossier = await loadCustomerDossier(id);
  if (!dossier) notFound();
  const [orders, onboardings, productions] = await Promise.all([
    loadOrdersForOrganization(dossier.organization.id),
    loadOnboardingsForOrganization(dossier.organization.id),
    loadProductionsForOrganization(dossier.organization.id),
  ]);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Klant"
        title={dossier.organization.name}
        text={dossier.facts.nextAction ? `Volgende actie: ${dossier.facts.nextAction}` : dossier.organization.website || "Klantdossier"}
        action={
          productions[0] ? (
            <Link href={`${workspaceRoutes.adminProductie}/${productions[0].id}`} className="text-sm underline underline-offset-4">
              Naar productie
            </Link>
          ) : null
        }
      />

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {customerTabs.map((item) => {
          const href = `${workspaceRoutes.adminCustomers}/${id}?tab=${item.value}`;
          const active = tab === item.value;
          return (
            <Link
              key={item.value}
              href={href}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium",
                active ? "bg-ink text-ivory" : "border border-ink/10 bg-white text-ink/70"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {tab === "overzicht" ? <OverviewPanel dossier={dossier} /> : null}
      {tab === "contact" ? <ContactPanel dossier={dossier} /> : null}
      {tab === "aanvragen" ? <LeadsPanel dossier={dossier} /> : null}
      {tab === "voorstellen" ? <ProposalsPanel dossier={dossier} /> : null}
      {tab === "opdrachten" ? <OrdersPanel dossier={dossier} orders={orders} onboardings={onboardings} /> : null}
      {tab === "website" ? <WebsitePanel dossier={dossier} /> : null}
      {tab === "merk" ? <BrandPanel dossier={dossier} /> : null}
      {tab === "bestanden" ? <FilesPanel dossier={dossier} /> : null}
      {tab === "facturen" ? <InvoicesPanel dossier={dossier} /> : null}
      {tab === "wijzigingen" ? <RequestsPanel dossier={dossier} /> : null}
      {tab === "activiteit" ? <ActivityPanel dossier={dossier} /> : null}
    </div>
  );
}
