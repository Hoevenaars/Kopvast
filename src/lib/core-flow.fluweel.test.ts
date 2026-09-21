import assert from "node:assert/strict";
import test from "node:test";
import { loadDueInvoiceActions, markInvoiceInvoiced } from "./billing";
import { afterProposalAccepted } from "./commercial-handoffs";
import { overrideOnboardingReady } from "./onboarding-store";
import { launchCheckItems } from "./production";
import {
  markOnboardingComplete,
  markProductionLive,
  recordApproval,
  saveLaunchCheck,
  sendToClientReview,
  startProduction,
} from "./production-board";
import { acceptProposal, createProposal, loadProposal, sendProposal } from "./proposal-ops";
import type { ProposalDraftInput } from "./proposals";
import { loadOrderDetail } from "./order-ops";
import { createCustomerRequest, loadOrganizations } from "./workspace";
import { readStore, withIsolatedStore } from "./workspace-store";

function fluweelDraft(): ProposalDraftInput {
  return {
    title: "Voorstel voor Fluweel Events",
    intro: "Nieuwe website en beheer.",
    aanleiding: "De huidige site is verouderd.",
    scopeSummary: "Maatwerkwebsite met beheer",
    planning: "Vier weken na onboarding",
    validityText: "14 dagen",
    recipientName: "Eva Linden",
    recipientEmail: "eva@fluweel.nl",
    recipientOrganization: "Fluweel Events",
    type: "maatwerk",
    lines: [
      {
        kind: "scope",
        title: "Kopvast Website",
        description: "Maatwerkwebsite",
        quantity: 1,
        unitPriceCents: 149500,
      },
      {
        kind: "recurring",
        title: "Kopvast Beheer",
        description: "Maandelijks beheer",
        quantity: 1,
        unitPriceCents: 19900,
      },
    ],
  };
}

function mustOk<T extends { ok: boolean }>(result: T, label: string): asserts result is T & { ok: true } {
  if (!result.ok) {
    throw new Error(`${label} faalde: ${JSON.stringify(result)}`);
  }
}

test("Fluweel-keten: akkoord tot factuur, beheer en support", async () => {
  await withIsolatedStore(async () => {
    const created = await createProposal({
      type: "maatwerk",
      recipientName: "Eva Linden",
      recipientEmail: "eva@fluweel.nl",
      recipientOrganization: "Fluweel Events",
      createdBy: "contact@kopvast.nl",
    });
    mustOk(created, "voorstel aanmaken");

    const sent = await sendProposal(created.id, fluweelDraft(), "contact@kopvast.nl");
    mustOk(sent, "voorstel versturen");

    const beforeAccept = await loadProposal(created.id);
    const token = beforeAccept?.proposal.current_token;
    assert.ok(token, "verzonden voorstel heeft een publieke token");

    const invalid = await acceptProposal("niet-een-token", {
      name: "Eva Linden",
      email: "eva@fluweel.nl",
      acceptedTerms: true,
    });
    assert.equal(invalid.ok, false);

    const accepted = await acceptProposal(token, {
      name: "Eva Linden",
      email: "eva@fluweel.nl",
      acceptedTerms: true,
    });
    mustOk(accepted, "voorstel accepteren");
    assert.ok(accepted.organizationId, "publiek akkoord geeft de klant-org terug");

    const again = await acceptProposal(token, {
      name: "Eva Linden",
      email: "eva@fluweel.nl",
      acceptedTerms: true,
    });
    mustOk(again, "tweede acceptatie");
    assert.equal(again.already, true);
    assert.equal(again.organizationId, accepted.organizationId);

    const handoff = await afterProposalAccepted(created.id);
    mustOk(handoff, "handoff na akkoord");
    assert.ok(handoff.orderId, "akkoord levert een opdracht");

    const afterAccept = await readStore();
    assert.equal(afterAccept.organizations.length, 1);
    assert.equal(afterAccept.organizations[0]?.name, "Fluweel Events");
    assert.equal(afterAccept.organizations[0]?.id, accepted.organizationId);
    const member = afterAccept.members.find((item) => item.email === "eva@fluweel.nl");
    assert.equal(member?.organization_id, accepted.organizationId);
    assert.equal(member?.access_enabled, true);
    assert.equal(afterAccept.orders.length, 1);
    assert.equal(afterAccept.orders[0]?.include_recurring_beheer, true);

    const deliveryProject = afterAccept.projects.find((item) => item.type === "maatwerk" || item.type === "website");
    assert.ok(deliveryProject, "opleverproject bestaat");
    assert.ok(afterAccept.projects.some((item) => item.type === "beheer"));
    assert.ok(afterAccept.onboardingChecklists.length >= 1);
    assert.ok(afterAccept.productions.length >= 1);
    assert.equal(afterAccept.billingInvoices.length, 1);
    assert.equal(afterAccept.billingInvoices[0]?.status, "NOT_INVOICED");
    assert.equal(afterAccept.billingInvoices[0]?.amount_ex_vat, 1495);
    assert.equal(afterAccept.invoices.length, 0);

    const due = await loadDueInvoiceActions();
    assert.ok(due.some((item) => item.title === "Factuur sturen" && item.company === "Fluweel Events"));

    const orderDetail = await loadOrderDetail(handoff.orderId ?? afterAccept.orders[0]!.id);
    assert.ok(orderDetail, "opdracht mag na akkoord worden geopend");
    assert.ok((orderDetail.onboarding?.progress.length ?? 0) > 5, "opdracht toont de projectchecklist, niet de oude orderstappen");
    assert.equal(orderDetail.invoices.length, 1);
    assert.equal(orderDetail.invoices[0]?.amount, 1495);
    assert.ok(orderDetail.deliveryOnboardingHref?.includes("/onboarding"));
    assert.equal(afterAccept.onboardings.length, 0);

    const againHandoff = await afterProposalAccepted(created.id);
    mustOk(againHandoff, "tweede handoff");
    assert.equal((await readStore()).billingInvoices.length, 1);

    const production =
      afterAccept.productions.find((item) => item.project_id === deliveryProject.id) ?? afterAccept.productions[0];
    assert.ok(production, "productiekaart bestaat");
    assert.equal(production.organization_id, handoff.organizationId);

    const onboarding =
      afterAccept.onboardingChecklists.find((item) => item.project_id === deliveryProject.id) ??
      afterAccept.onboardingChecklists[0];
    assert.ok(onboarding);
    const ready = await overrideOnboardingReady({
      onboardingId: onboarding.id,
      reason: "Onboarding handmatig ontgrendeld voor livegang",
      actorEmail: "contact@kopvast.nl",
    });
    mustOk(ready, "onboarding override");

    const completed = await markOnboardingComplete(production.id, "contact@kopvast.nl");
    mustOk(completed, "onboarding afronden");

    const started = await startProduction(production.id, "contact@kopvast.nl");
    mustOk(started, "productie starten");

    const review = await sendToClientReview(
      production.id,
      {
        previewUrl: "https://fluweel.nl",
        reviewMessage: "Bekijk het concept van Fluweel Events.",
      },
      "contact@kopvast.nl"
    );
    mustOk(review, "naar klantreview");

    const organizationId = production.organization_id;
    const concept = await recordApproval({
      productionId: production.id,
      organizationId,
      kind: "concept",
      name: "Eva Linden",
      email: "eva@fluweel.nl",
    });
    mustOk(concept, "conceptakkoord");

    for (const item of launchCheckItems) {
      if (item.key === "final_approval") continue;
      const check = await saveLaunchCheck(production.id, item.key, true, "contact@kopvast.nl");
      mustOk(check, `livegang-check ${item.key}`);
    }

    const finalOk = await recordApproval({
      productionId: production.id,
      organizationId,
      kind: "final",
      name: "Eva Linden",
      email: "eva@fluweel.nl",
    });
    mustOk(finalOk, "definitief akkoord");

    const live = await markProductionLive(production.id, "contact@kopvast.nl");
    mustOk(live, "markeer live");

    const afterLive = await readStore();
    assert.equal(afterLive.productions.find((item) => item.id === production.id)?.status, "live");
    assert.equal(afterLive.orders[0]?.status, "LIVE");
    assert.ok(afterLive.projects.some((item) => item.type === "beheer" && item.status === "live"));
    assert.ok(afterLive.activity.some((item) => item.event_type === "WEBSITE_LIVE"));
    assert.ok(afterLive.activity.some((item) => item.event_type === "MANAGEMENT_STARTED"));

    const invoice = afterLive.billingInvoices[0];
    assert.ok(invoice, "akkoord zaait een billing-factuur");
    const invoiced = await markInvoiceInvoiced(invoice.id);
    mustOk(invoiced, "factuur markeren als verstuurd");

    const support = await createCustomerRequest({
      organizationId,
      email: "eva@fluweel.nl",
      type: "support",
      title: "Startvraag na live",
      body: "Kunnen we het contactformulier nog een keer nalopen?",
    });
    mustOk(support, "supportvraag");

    const orgs = await loadOrganizations();
    assert.equal(orgs.length, 1);
    const done = await readStore();
    assert.equal(done.requests.length, 1);
    assert.equal(done.requests[0]?.title, "Startvraag na live");
    assert.ok(done.activity.some((item) => item.event_type === "SUPPORT_CREATED"));
    assert.ok(done.activity.some((item) => item.event_type === "INVOICE_STATUS_CHANGED"));
    assert.equal(done.orders.length, 1);
  });
});
