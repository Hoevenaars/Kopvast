import assert from "node:assert/strict";
import test from "node:test";
import { acceptProposal, createProposalForCustomer, loadCustomerDossier } from "./customer-dossier";
import { mutateStore, newId, nowIso, readStore, withIsolatedStore } from "./workspace-store";

test("dossier-voorstel schrijft WR-voorstel en akkoord maakt opdracht", async () => {
  await withIsolatedStore(async () => {
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

    const created = await createProposalForCustomer({
      organizationId: orgId,
      title: "Extra pagina Fluweel",
      body: "Een extra landingspagina bij de website.",
      productType: "maatwerk",
      amountLabel: "€1.495",
      actorEmail: "contact@kopvast.nl",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

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
