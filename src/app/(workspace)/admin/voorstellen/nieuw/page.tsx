import type { Metadata } from "next";
import { createProposalAction } from "@/app/(workspace)/admin/voorstellen/actions";
import { fieldClass, Field } from "@/components/form-fields";
import { PageIntro } from "@/components/workspace/page-frame";
import { SubmitButton } from "@/components/workspace/form-busy";
import { proposalTypes } from "@/lib/proposals";
import { loadLeads, loadOrganizations } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Nieuw voorstel",
  robots: { index: false, follow: false },
};

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; fout?: string }>;
}) {
  const params = await searchParams;
  const [leads, organizations] = await Promise.all([loadLeads(), loadOrganizations()]);
  const selectedLead = leads.find((item) => item.id === params.lead);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageIntro
        eyebrow="Voorstellen"
        title="Nieuw voorstel"
        text="Maatwerk is first class. Je kunt later regels, planning en prijs nog aanscherpen."
      />
      {params.fout ? <p className="text-sm text-destructive">{params.fout}</p> : null}
      <form action={createProposalAction} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <Field id="lead_id" label="Aanvraag (optioneel)">
          <select id="lead_id" name="lead_id" defaultValue={params.lead ?? ""} className={fieldClass}>
            <option value="">Geen aanvraag</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {(lead.company_name || lead.name) + ` · ${lead.email}`}
              </option>
            ))}
          </select>
        </Field>
        <Field id="organization_id" label="Bestaande klant (optioneel)">
          <select id="organization_id" name="organization_id" defaultValue="" className={fieldClass}>
            <option value="">Nieuwe of losse prospect</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="recipient_organization" label="Organisatie">
          <input
            id="recipient_organization"
            name="recipient_organization"
            defaultValue={selectedLead?.company_name ?? ""}
            className={fieldClass}
            required
          />
        </Field>
        <Field id="recipient_name" label="Naam">
          <input id="recipient_name" name="recipient_name" defaultValue={selectedLead?.name ?? ""} className={fieldClass} />
        </Field>
        <Field id="recipient_email" label="E-mail">
          <input
            id="recipient_email"
            name="recipient_email"
            type="email"
            defaultValue={selectedLead?.email ?? ""}
            className={fieldClass}
            required
          />
        </Field>
        <Field id="type" label="Type">
          <select id="type" name="type" defaultValue={selectedLead?.type === "website" ? "website" : "maatwerk"} className={fieldClass}>
            {proposalTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory">
          Voorstel maken
        </SubmitButton>
      </form>
    </div>
  );
}
