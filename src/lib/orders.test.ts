import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProposalSnapshot,
  defaultNextAction,
  evaluateStatusChange,
  invoicePlan,
  matchesOrderFilter,
  materializeAcceptedProposal,
  nextOrderNumber,
  parseAmount,
  parseNextActionInput,
  parseOnboardingProgress,
  skippedCriticalGates,
  websiteStatusForOrder,
  type ProposalRow,
} from "./orders";

function proposal(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "prop-1",
    created_at: "2026-09-16T10:00:00.000Z",
    updated_at: "2026-09-16T10:00:00.000Z",
    organization_id: null,
    inbound_lead_id: "lead-1",
    prospect_id: null,
    customer_name: "Eva Lint",
    customer_email: "eva@atelierlint.nl",
    company_name: "Atelier Lint",
    website: "atelierlint.nl",
    product_type: "website",
    title: "Kopvast Website — Atelier Lint",
    status: "ACCEPTED",
    price_amount: 1495,
    price_label: null,
    price_cadence: "eenmalig, excl. btw",
    include_recurring_beheer: true,
    recurring_price_amount: 199,
    recurring_price_label: null,
    scope: "Maximaal zes kernpagina’s.",
    snapshot: {},
    accepted_at: "2026-09-16T10:00:00.000Z",
    ...overrides,
  };
}

test("order numbers lopen per jaar op", () => {
  assert.equal(nextOrderNumber([], new Date("2026-09-16")), "KV-2026-0001");
  assert.equal(nextOrderNumber(["KV-2026-0001", "KV-2025-0099"], new Date("2026-09-16")), "KV-2026-0002");
});

test("filter koppelt statussen aan het overzicht", () => {
  assert.equal(matchesOrderFilter("ONBOARDING", "onboarding"), true);
  assert.equal(matchesOrderFilter("IN_PRODUCTION", "productie"), true);
  assert.equal(matchesOrderFilter("CLIENT_REVIEW", "review"), true);
  assert.equal(matchesOrderFilter("CHANGES", "wijzigingen"), true);
  assert.equal(matchesOrderFilter("READY_TO_LAUNCH", "klaar_voor_live"), true);
  assert.equal(matchesOrderFilter("LIVE", "live"), true);
  assert.equal(matchesOrderFilter("ON_HOLD", "on_hold"), true);
  assert.equal(matchesOrderFilter("LIVE", "onboarding"), false);
});

test("kritieke gates vragen om override", () => {
  assert.deepEqual(skippedCriticalGates("NEW", "ONBOARDING"), []);
  assert.deepEqual(skippedCriticalGates("NEW", "IN_PRODUCTION"), ["ONBOARDING"]);
  assert.deepEqual(skippedCriticalGates("IN_PRODUCTION", "LIVE"), [
    "CLIENT_REVIEW",
    "APPROVED",
    "READY_TO_LAUNCH",
  ]);
  const blocked = evaluateStatusChange({ from: "NEW", to: "LIVE" });
  assert.equal(blocked.ok, false);
  const allowed = evaluateStatusChange({ from: "NEW", to: "LIVE", override: true });
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.equal(allowed.override, true);
});

test("snapshot bewaart afgesproken prijs en beheer", () => {
  const snapshot = buildProposalSnapshot(proposal(), "2026-09-16T10:00:00.000Z");
  assert.equal(snapshot.amount, 1495);
  assert.equal(snapshot.includeRecurringBeheer, true);
  assert.equal(snapshot.recurringAmount, 199);
  assert.match(snapshot.priceLabel ?? "", /1.495|1495/);
  const invoices = invoicePlan(snapshot);
  assert.equal(invoices.length, 3);
  assert.equal(invoices[0]?.kind, "deposit");
  assert.equal((invoices[0]?.amount ?? 0) + (invoices[1]?.amount ?? 0), 1495);
});

test("geaccepteerd voorstel maakt precies één opdracht, idempotent", () => {
  const ids = ["order-1", "onb-1", "web-1", "inv-1", "inv-2", "inv-3", "act-1"];
  const newId = () => ids.shift() ?? "extra";
  const first = materializeAcceptedProposal({
    proposal: proposal(),
    organizationId: "org-1",
    existingOrderNumbers: [],
    actorEmail: "contact@kopvast.nl",
    now: new Date("2026-09-16T10:00:00.000Z"),
    newId,
  });
  assert.equal(first.already, false);
  assert.equal(first.order.order_number, "KV-2026-0001");
  assert.equal(first.order.agreed_price_amount, 1495);
  assert.equal(first.order.proposal_id, "prop-1");
  assert.equal(first.onboarding.order_id, first.order.id);
  assert.equal(first.website.order_id, first.order.id);
  assert.ok(first.invoices.length >= 2);
  assert.equal(first.activity?.event_type, "ORDER_CREATED");
  assert.equal(first.order.next_action, "Wachten op foto's");

  const second = materializeAcceptedProposal({
    proposal: proposal(),
    organizationId: "org-1",
    existingOrderNumbers: [first.order.order_number],
    existing: {
      order: first.order,
      onboarding: first.onboarding,
      website: first.website,
      invoices: first.invoices,
    },
    actorEmail: "contact@kopvast.nl",
    newId: () => "should-not-run",
  });
  assert.equal(second.already, true);
  assert.equal(second.order.id, first.order.id);
  assert.equal(second.order.order_number, first.order.order_number);
  assert.equal(second.activity, null);
});

test("next action eist tekst en accepteert optionele eigenaar", () => {
  assert.equal(parseNextActionInput({ text: "" }).ok, false);
  const ok = parseNextActionInput({ text: "Homepage bouwen", at: "2026-09-20", owner: "Nick" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.text, "Homepage bouwen");
    assert.equal(ok.at, "2026-09-20");
    assert.equal(ok.owner, "Nick");
  }
  assert.equal(defaultNextAction("CHANGES").text, "Wijzigingen verwerken");
  assert.equal(defaultNextAction("LIVE", new Date("2026-09-21T12:00:00.000Z")).text, "Factuur sturen");
  assert.equal(defaultNextAction("LIVE", new Date("2026-09-21T12:00:00.000Z")).at, "2026-09-21");
});

test("bedragen en onboarding-progress blijven bruikbaar", () => {
  assert.equal(parseAmount("1.495,00"), 1495);
  assert.equal(parseAmount("1495.50"), 1495.5);
  const progress = parseOnboardingProgress([{ id: "fotos", title: "Foto's", done: true }]);
  assert.equal(progress.find((item) => item.id === "fotos")?.done, true);
  assert.equal(progress.find((item) => item.id === "logo")?.done, false);
  assert.equal(websiteStatusForOrder("IN_PRODUCTION"), "building");
  assert.equal(websiteStatusForOrder("LIVE"), "live");
});
