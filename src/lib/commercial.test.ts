import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCommercialStage,
  intentFromAcquisitionChoice,
  labelForCommercialStage,
  nextActionForHandoff,
  NEXT_ACTIONS,
  requestStatusForIntent,
  serviceBoundaries,
  shouldFinishAnalysisManually,
} from "./commercial";
import { liveProposalToOrderProposal } from "./commercial-handoffs";
import { normalizeDomain, normalizeEmailAddress, normalizeOrganization, sameDomain } from "./identity";
import type { ProposalRow } from "./proposals";

test("normaliseert domeinen tot hetzelfde host", () => {
  assert.equal(normalizeDomain("https://www.example.nl/"), "example.nl");
  assert.equal(normalizeDomain("http://example.nl"), "example.nl");
  assert.equal(normalizeDomain("www.example.nl"), "example.nl");
  assert.equal(normalizeDomain("example.nl"), "example.nl");
  assert.equal(sameDomain("https://www.fluweelevents.nl/over", "fluweelevents.nl"), true);
});

test("normaliseert e-mail en organisatie", () => {
  assert.equal(normalizeEmailAddress("  Contact@Kopvast.nl "), "contact@kopvast.nl");
  assert.equal(normalizeEmailAddress("niet-geldig"), null);
  assert.equal(normalizeOrganization("Fluweel  Events B.V."), "fluweel events b v");
});

test("vertaalt acquisitie-keuze naar commerciële intent", () => {
  assert.equal(intentFromAcquisitionChoice("voorstel"), "PROPOSAL");
  assert.equal(intentFromAcquisitionChoice("info"), "MORE_INFO");
  assert.equal(intentFromAcquisitionChoice("MORE_INFO"), "MORE_INFO");
});

test("leidt commerciële fase af uit bestaande objecten", () => {
  assert.equal(deriveCommercialStage({}), "PROSPECT");
  assert.equal(deriveCommercialStage({ intent: "MORE_INFO" }), "ENGAGED");
  assert.equal(deriveCommercialStage({ requestStatus: "NIEUW" }), "REQUESTED");
  assert.equal(deriveCommercialStage({ requestStatus: "QUALIFIED" }), "QUALIFIED");
  assert.equal(deriveCommercialStage({ proposalStatus: "SENT" }), "PROPOSAL");
  assert.equal(deriveCommercialStage({ proposalStatus: "ACCEPTED" }), "WON");
  assert.equal(deriveCommercialStage({ hasOrder: true }), "CUSTOMER");
  assert.equal(labelForCommercialStage("QUALIFIED"), "Gekwalificeerd");
});

test("zet requeststatus en next action voor handoffs", () => {
  assert.equal(requestStatusForIntent({ intent: "PROPOSAL", productFit: "STANDARD_FIT" }), "QUALIFIED");
  assert.equal(requestStatusForIntent({ intent: "PROPOSAL", productFit: "CUSTOM_FIT" }), "MAATWERK_REVIEW");
  assert.equal(nextActionForHandoff({ intent: "PROPOSAL" }), NEXT_ACTIONS.MAKE_PROPOSAL);
  assert.equal(nextActionForHandoff({ intent: "MORE_INFO", hasAnalysis: false }), NEXT_ACTIONS.FINISH_ANALYSIS);
  assert.equal(nextActionForHandoff({ intent: "MORE_INFO", hasAnalysis: true }), NEXT_ACTIONS.CALL_CLIENT);
  assert.equal(shouldFinishAnalysisManually({ hasAnalysis: false }), true);
  assert.equal(shouldFinishAnalysisManually({ hasAnalysis: true }), false);
  assert.equal(shouldFinishAnalysisManually({ hasAnalysis: false, existingNextAction: NEXT_ACTIONS.CALL_CLIENT }), false);
});

test("hergebruikt bestaande proposal- en ordermodules", () => {
  const bounds = serviceBoundaries();
  assert.match(bounds.proposal, /proposal-ops/);
  assert.match(bounds.order, /order-ops/);
  assert.doesNotMatch(bounds.proposal, /kopvast_proposals/);
});

test("mapt een live voorstel naar de bestaande order-proposalvorm", () => {
  const proposal = {
    id: "prop-1",
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
    number: "KOP-2026-0001",
    version: 1,
    type: "maatwerk",
    status: "ACCEPTED",
    title: "Voorstel voor Fluweel Events",
    intro: "",
    aanleiding: "Nieuwe website",
    scope_summary: "Maatwerkwebsite",
    planning: "",
    validity_text: "",
    recipient_name: "Eva",
    recipient_email: "eva@fluweel.nl",
    recipient_organization: "Fluweel Events",
    organization_id: "org-1",
    inbound_lead_id: "lead-1",
    prospect_id: "prospect-1",
    current_token: null,
    current_version_id: null,
    subtotal_cents: 450000,
    recurring_monthly_cents: 19900,
    vat_cents: 94500,
    total_cents: 544500,
    sent_at: null,
    first_viewed_at: null,
    last_viewed_at: null,
    question_text: null,
    question_at: null,
    accepted_at: "2026-09-20T12:00:00.000Z",
    accepted_by_name: "Eva",
    accepted_by_email: "eva@fluweel.nl",
    accepted_snapshot: null,
    handed_off_at: null,
    created_by_email: "contact@kopvast.nl",
  } satisfies ProposalRow;

  const mapped = liveProposalToOrderProposal(proposal);
  assert.equal(mapped.id, "prop-1");
  assert.equal(mapped.status, "ACCEPTED");
  assert.equal(mapped.product_type, "maatwerk");
  assert.equal(mapped.price_amount, 4500);
  assert.equal(mapped.include_recurring_beheer, true);
  assert.equal(mapped.inbound_lead_id, "lead-1");
});
