import assert from "node:assert/strict";
import test from "node:test";
import { loadDueInvoiceActions, seedBillingForAcceptedOrder, seedBillingForApprovedOrder } from "./billing";
import { mutateStore, newId, nowIso, readStore, withIsolatedStore } from "./workspace-store";

test("akkoord zaait 50% aanbetaling, goedkeuring de rest", async () => {
  await withIsolatedStore(async () => {
    const orgId = newId();
    const projectId = newId();
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
    });

    await seedBillingForAcceptedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    let store = await readStore();
    assert.equal(store.billingInvoices.length, 1);
    assert.equal(store.billingInvoices[0]?.amount_ex_vat, 747.5);
    assert.match(store.billingInvoices[0]?.description ?? "", /50% bij opdrachtbevestiging/);
    assert.equal(store.billingInvoices[0]?.status, "NOT_INVOICED");

    await seedBillingForAcceptedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    assert.equal((await readStore()).billingInvoices.length, 1);

    const dueAfterAccept = await loadDueInvoiceActions();
    assert.equal(dueAfterAccept.length, 1);
    assert.equal(dueAfterAccept[0]?.title, "Factuur sturen");
    assert.equal(dueAfterAccept[0]?.company, "Fluweel Events");

    await seedBillingForApprovedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    store = await readStore();
    assert.equal(store.billingInvoices.length, 2);
    assert.equal(
      store.billingInvoices.reduce((sum, item) => sum + item.amount_ex_vat, 0),
      1495
    );
    assert.ok(store.billingInvoices.some((item) => item.description.includes("50% na goedkeuring")));

    await seedBillingForApprovedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    assert.equal((await readStore()).billingInvoices.length, 2);

    const dueAfterApproval = await loadDueInvoiceActions();
    assert.equal(dueAfterApproval.length, 2);
  });
});

test("bestaande volle factuur wordt niet opgesplitst", async () => {
  await withIsolatedStore(async () => {
    const orgId = newId();
    const projectId = newId();
    await mutateStore((store) => {
      const created = nowIso();
      store.billingInvoices.unshift({
        id: newId(),
        organization_id: orgId,
        project_id: projectId,
        description: "Kopvast Website",
        amount_ex_vat: 1495,
        status: "NOT_INVOICED",
        invoice_number: null,
        invoice_date: null,
        due_date: null,
        external_reference: null,
        paid_at: null,
        created_at: created,
        updated_at: created,
      });
    });
    await seedBillingForAcceptedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    await seedBillingForApprovedOrder({
      organizationId: orgId,
      projectId,
      description: "Kopvast Website",
      amount: 1495,
    });
    const store = await readStore();
    assert.equal(store.billingInvoices.length, 1);
    assert.equal(store.billingInvoices[0]?.amount_ex_vat, 1495);
  });
});
