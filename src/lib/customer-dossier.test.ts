import assert from "node:assert/strict";
import test from "node:test";
import { loadBillingOverview, loadDueInvoiceActions } from "./billing";
import {
  acceptProposal,
  addCustomerInvoice,
  createProposalForCustomer,
  loadCustomerDossier,
  updateInvoiceStatus,
} from "./customer-dossier";
import { mutateStore, newId, nowIso, readStore, withIsolatedStore } from "./workspace-store";

async function seedFluweel() {
  const orgId = newId();
  await mutateStore((store) => {
    store.organizations.unshift({
      id: orgId,
      name: "Fluweel Events",
      website: "https://fluweel.nl",
      status: "onboarding",
      inbound_lead_id: null,
      prospect_id: null,
      notes: null,
      created_at: nowIso(),
    });
    store.members.push({
      id: newId(),
      organization_id: orgId,
      name: "Eva Linden",
      email: "eva@fluweel.nl",
      role: "owner",
      access_enabled: true,
    });
  });
  return orgId;
}

test("dossier-voorstel schrijft WR-voorstel en akkoord maakt opdracht", async () => {
  await withIsolatedStore(async () => {
    const orgId = await seedFluweel();

    const created = await createProposalForCustomer({
      organizationId: orgId,
      title: "Extra pagina Fluweel",
      body: "Een extra landingspagina bij de website.",
      productType: "maatwerk",
      amountLabel: "€1.495",
      actorEmail: "contact@kopvast.nl",
    });
    if (!created.ok) throw new Error(`voorstel aanmaken faalde: ${created.message}`);

    const afterCreate = await readStore();
    assert.equal(afterCreate.voorstellen.length, 1);
    assert.equal(afterCreate.customerProposals.length, 0);
    assert.equal(afterCreate.voorstellen[0]?.title, "Extra pagina Fluweel");
    assert.equal(afterCreate.voorstellen[0]?.status, "DRAFT");
    assert.equal(afterCreate.voorstellen[0]?.subtotal_cents, 149500);

    const accepted = await acceptProposal(created.proposalId, "contact@kopvast.nl");
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.organizationId, orgId);

    const after = await readStore();
    assert.equal(after.voorstellen[0]?.status, "ACCEPTED");
    assert.ok(after.voorstellen[0]?.accepted_snapshot);
    assert.equal(after.orders.length, 1);
    assert.equal(after.orders[0]?.organization_id, orgId);
    assert.ok(after.orders[0]?.proposal_id === created.proposalId);

    const again = await acceptProposal(created.proposalId, "contact@kopvast.nl");
    assert.equal(again.ok, true);
    if (again.ok) assert.equal(again.already, true);
    assert.equal((await readStore()).orders.length, 1);

    const dossier = await loadCustomerDossier(orgId);
    assert.ok(dossier);
    assert.equal(dossier.proposals.length, 1);
    assert.equal(dossier.proposals[0]?.status, "geaccepteerd");
  });
});

test("dossier-factuur schrijft billing-factuur en komt op Vandaag", async () => {
  await withIsolatedStore(async () => {
    const orgId = await seedFluweel();
    const created = await addCustomerInvoice({
      organizationId: orgId,
      title: "Website Fluweel Events",
      amountLabel: "€1.495",
      number: "KV-F-1",
      actorEmail: "contact@kopvast.nl",
    });
    if (!created.ok) throw new Error(`factuur aanmaken faalde: ${"message" in created ? created.message : ""}`);

    const afterCreate = await readStore();
    assert.equal(afterCreate.customerInvoices.length, 0);
    assert.equal(afterCreate.billingInvoices.length, 1);
    assert.equal(afterCreate.billingInvoices[0]?.status, "NOT_INVOICED");
    assert.equal(afterCreate.billingInvoices[0]?.amount_ex_vat, 1495);
    assert.equal(afterCreate.billingInvoices[0]?.invoice_number, "KV-F-1");

    const dossier = await loadCustomerDossier(orgId);
    assert.ok(dossier);
    assert.equal(dossier.invoices.length, 1);
    assert.equal(dossier.invoices[0]?.status, "concept");
    assert.equal(dossier.invoices[0]?.title, "Website Fluweel Events");

    const overview = await loadBillingOverview();
    assert.equal(overview.invoices.length, 1);
    assert.equal(overview.counts.notInvoiced, 1);
    const due = await loadDueInvoiceActions();
    assert.ok(due.some((item) => item.title === "Factuur sturen" && item.company === "Fluweel Events"));

    const sent = await updateInvoiceStatus(created.invoiceId, "verstuurd");
    if (!sent.ok) throw new Error(`factuur versturen faalde: ${sent.message}`);
    const afterSend = await readStore();
    assert.equal(afterSend.billingInvoices[0]?.status, "INVOICED");
    assert.ok(afterSend.activity.some((item) => item.event_type === "INVOICE_STATUS_CHANGED"));

    const acceptedDossier = await loadCustomerDossier(orgId);
    assert.equal(acceptedDossier?.invoices[0]?.status, "verstuurd");
  });
});
