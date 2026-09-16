"use client";

import { useActionState } from "react";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { Field, areaClass, fieldClass } from "@/components/form-fields";
import { projectTypes } from "@/lib/product";
import { productDefaults } from "@/lib/orders";

type State = { message?: string } | null;

export function NewOrderForm({
  action,
  organizations,
  leads,
  defaults,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  organizations: Array<{ id: string; name: string }>;
  leads: Array<{ id: string; label: string }>;
  defaults: {
    organizationId: string;
    leadId: string;
    customerName: string;
    customerEmail: string;
    companyName: string;
    website: string;
    productType: string;
  };
}) {
  const [state, formAction] = useActionState(action, null);
  const amount = productDefaults(defaults.productType === "maatwerk" ? "maatwerk" : "website").amount;

  return (
    <form action={formAction} className="relative space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
      <FormBusyOverlay label="Opdracht aanmaken…" />
      {defaults.leadId ? <input type="hidden" name="leadId" value={defaults.leadId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="organizationId" label="Bestaande klant">
          <select id="organizationId" name="organizationId" defaultValue={defaults.organizationId} className={fieldClass}>
            <option value="">Nieuwe klant</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        {!defaults.leadId ? (
          <Field id="leadIdSelect" label="Of vanuit aanvraag">
            <select id="leadIdSelect" name="leadId" defaultValue="" className={fieldClass}>
              <option value="">Geen aanvraag</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field id="leadLabel" label="Aanvraag">
            <input id="leadLabel" disabled value={defaults.companyName} className={fieldClass} />
          </Field>
        )}
        <Field id="customerName" label="Contactnaam">
          <input id="customerName" name="customerName" required defaultValue={defaults.customerName} className={fieldClass} />
        </Field>
        <Field id="customerEmail" label="E-mail">
          <input id="customerEmail" name="customerEmail" type="email" defaultValue={defaults.customerEmail} className={fieldClass} />
        </Field>
        <Field id="companyName" label="Bedrijf">
          <input id="companyName" name="companyName" defaultValue={defaults.companyName} className={fieldClass} />
        </Field>
        <Field id="website" label="Website">
          <input id="website" name="website" defaultValue={defaults.website} className={fieldClass} />
        </Field>
        <Field id="productType" label="Product">
          <select id="productType" name="productType" defaultValue={defaults.productType} className={fieldClass}>
            {projectTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="priceAmount" label="Afgesproken prijs (excl. btw)">
          <input
            id="priceAmount"
            name="priceAmount"
            defaultValue={amount ?? ""}
            inputMode="decimal"
            className={fieldClass}
          />
        </Field>
        <Field id="targetLiveAt" label="Target live">
          <input id="targetLiveAt" name="targetLiveAt" type="date" className={fieldClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="includeRecurringBeheer" defaultChecked={defaults.productType === "website"} />
        Kopvast Beheer meenemen (€199 per maand)
      </label>
      <Field id="scope" label="Scope">
        <textarea
          id="scope"
          name="scope"
          className={areaClass}
          defaultValue="Maximaal zes kernpagina’s, herkenbare uitstraling, contactmogelijkheden en één correctieronde."
        />
      </Field>
      {state?.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <SubmitButton
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
        pendingLabel="Aanmaken…"
      >
        Maak opdracht na akkoord
      </SubmitButton>
    </form>
  );
}
