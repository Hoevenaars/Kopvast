import type { Metadata } from "next";
import { createOrderAction } from "@/app/(workspace)/admin/opdrachten/actions";
import { PageIntro } from "@/components/workspace/page-frame";
import { NewOrderForm } from "@/app/(workspace)/admin/opdrachten/new-order-form";
import { loadLead, loadLeads, loadOrganizations } from "@/lib/workspace";
import { loadOrderByLead } from "@/lib/order-ops";
import { workspaceRoutes } from "@/lib/product";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Nieuwe opdracht", robots: { index: false, follow: false } };

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; organizationId?: string }>;
}) {
  const params = await searchParams;
  const [organizations, leads, lead, existing] = await Promise.all([
    loadOrganizations(),
    loadLeads(),
    params.leadId ? loadLead(params.leadId) : Promise.resolve(null),
    params.leadId ? loadOrderByLead(params.leadId) : Promise.resolve(null),
  ]);

  if (existing) redirect(`${workspaceRoutes.adminOrders}/${existing.id}`);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Opdrachten"
        title="Nieuwe opdracht"
        text="Akkoord op het voorstel maakt klant, opdracht, snapshot, onboarding en volgende actie. Een tweede keer op hetzelfde voorstel doet niets extra’s."
      />
      <NewOrderForm
        action={createOrderAction}
        organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
        leads={leads.slice(0, 40).map((item) => ({
          id: item.id,
          label: item.company_name || item.name,
        }))}
        defaults={{
          organizationId: params.organizationId ?? "",
          leadId: lead?.id ?? "",
          customerName: lead?.name ?? "",
          customerEmail: lead?.email ?? "",
          companyName: lead?.company_name ?? lead?.name ?? "",
          website: lead?.website ?? "",
          productType: lead?.type === "maatwerk" ? "maatwerk" : "website",
        }}
      />
    </div>
  );
}
