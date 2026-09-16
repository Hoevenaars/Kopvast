import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { convertLeadAction, setLeadStatus } from "@/app/(workspace)/admin/leads/actions";
import { PageIntro } from "@/components/workspace/page-frame";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { fieldClass } from "@/components/form-fields";
import { labelFor, leadStatuses, workspaceRoutes } from "@/lib/product";
import { loadOrderByLead } from "@/lib/order-ops";
import { loadLead } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Aanvraag",
  robots: { index: false, follow: false },
};

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await loadLead(id);
  if (!lead) notFound();
  const order = await loadOrderByLead(lead.id);

  const fields = [
    ["Type", lead.type],
    ["Naam", lead.name],
    ["E-mail", lead.email],
    ["Telefoon", lead.phone],
    ["Bedrijf", lead.company_name],
    ["Website", lead.website],
    ["Pagina's", lead.pages],
    ["Merk", lead.has_brand],
    ["Idee", lead.request_detail],
    ["Functionaliteit", lead.functionality],
    ["Omvang", lead.scale],
    ["Timing", lead.timing],
    ["Toelichting", lead.notes],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Lead" title={lead.company_name || lead.name} />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={labelFor(leadStatuses, lead.status)} tone={toneForStatus(lead.status)} />
        <p className="text-sm text-olive">{new Date(lead.created_at).toLocaleString("nl-NL")}</p>
      </div>
      <dl className="mt-8 divide-y divide-stone/40 rounded-2xl border border-stone/50">
        {fields.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm text-olive">{label}</dt>
            <dd className="text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-stone/50 p-5 sm:flex-row sm:items-end">
        <form action={setLeadStatus} className="flex-1 space-y-2">
          <input type="hidden" name="id" value={lead.id} />
          <label htmlFor="status" className="text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" name="status" defaultValue={lead.status} className={fieldClass}>
            {leadStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="submit" className="mt-3 text-sm underline underline-offset-4">
            Status opslaan
          </button>
        </form>
        {lead.status !== "OMGEZET" ? (
          <form action={convertLeadAction}>
            <input type="hidden" name="id" value={lead.id} />
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
            >
              Zet om naar klant
            </button>
          </form>
        ) : null}
        {order ? (
          <Link
            href={`${workspaceRoutes.adminOrders}/${order.id}`}
            className="inline-flex h-11 items-center rounded-md border border-ink/10 px-5 text-sm font-semibold"
          >
            Open opdracht {order.order_number}
          </Link>
        ) : (
          <Link
            href={`${workspaceRoutes.adminOrders}/nieuw?leadId=${lead.id}`}
            className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
          >
            Maak opdracht
          </Link>
        )}
      </div>
    </div>
  );
}
