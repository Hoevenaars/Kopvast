import assert from "node:assert/strict";
import test from "node:test";
import {
  bronLabel,
  domainFromWebsite,
  existingDraftProposal,
  inferredProductFit,
  isDueRequestAction,
  mapLiveProposalStatus,
  matchesAanvraagFilter,
  matchesAanvraagSearch,
  proposalLinesForFit,
  recentManualDuplicate,
  requestBron,
  defaultProductFitForSource,
  domainAanvraagFields,
} from "./aanvragen-model";
import { products } from "./site";

const fluweel = {
  company_name: "Fluweel Events",
  name: "Eva Linden",
  email: "eva@fluweel.nl",
  website: "https://www.fluweel.nl/contact",
  status: "QUALIFIED",
  product_fit: "CUSTOM_FIT" as const,
  type: "maatwerk",
  proposal_id: null,
  source: "maatwerk",
  payload: { source: "maatwerk" },
};

test("zoekt aanvragen op organisatie, naam, mail en domein", () => {
  assert.equal(matchesAanvraagSearch(fluweel, "fluweel"), true);
  assert.equal(matchesAanvraagSearch(fluweel, "Eva"), true);
  assert.equal(matchesAanvraagSearch(fluweel, "eva@fluweel.nl"), true);
  assert.equal(matchesAanvraagSearch(fluweel, "fluweel.nl"), true);
  assert.equal(matchesAanvraagSearch(fluweel, "onbekend"), false);
  assert.equal(domainFromWebsite(fluweel.website), "fluweel.nl");
});

test("filtert nieuw, review, fit, voorstel, gewonnen en verloren", () => {
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "NIEUW", product_fit: "STANDARD_FIT" }, "nieuw"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "MAATWERK_REVIEW", product_fit: "CUSTOM_FIT" }, "review"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, product_fit: "REVIEW_REQUIRED", status: "NIEUW" }, "review"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, product_fit: "STANDARD_FIT" }, "standard"), true);
  assert.equal(matchesAanvraagFilter(fluweel, "custom"), true);
  assert.equal(matchesAanvraagFilter(fluweel, "voorstel"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, proposal_id: "p1" }, "voorstel"), false);
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "GEWONNEN" }, "gewonnen"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "OMGEZET" }, "gewonnen"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "VERLOREN" }, "verloren"), true);
  assert.equal(matchesAanvraagFilter({ ...fluweel, status: "AFGEWEZEN" }, "verloren"), true);
});

test("maatwerk is CUSTOM_FIT en website STANDARD_FIT", () => {
  assert.equal(defaultProductFitForSource("maatwerk"), "CUSTOM_FIT");
  assert.equal(defaultProductFitForSource("website-aanvraag"), "STANDARD_FIT");
  assert.equal(inferredProductFit({ product_fit: null, type: "maatwerk", status: "NIEUW" }), "CUSTOM_FIT");
  assert.equal(inferredProductFit({ product_fit: "STANDARD_FIT", type: "maatwerk", status: "NIEUW" }), "STANDARD_FIT");
});

test("bronlabels blijven herkenbaar", () => {
  assert.equal(bronLabel("maatwerk"), "Maatwerkformulier");
  assert.equal(bronLabel("MANUAL"), "Handmatig");
  assert.equal(bronLabel("kopvast-acquisitie"), "Acquisitie");
  assert.equal(bronLabel("acquisitie-voorstel"), "Acquisitie · voorstel");
  assert.equal(bronLabel("acquisitie-info"), "Acquisitie · meer info");
  assert.equal(bronLabel("domain_landingspage"), "Domeininteresse");
  assert.equal(requestBron({ source: "kopvast", payload: { source: "website-aanvraag" } }), "Websiteformulier");
});

test("domeinleads vallen in het domeinfilter, niet in standard fit", () => {
  const row = {
    ...fluweel,
    status: "NIEUW",
    product_fit: "REVIEW_REQUIRED" as const,
    type: "website",
    source: "domain_landingspage",
    payload: { source: "domain_landingspage" },
    proposal_id: null,
  };
  assert.equal(matchesAanvraagFilter(row, "domein"), true);
  assert.equal(matchesAanvraagFilter(row, "standard"), false);
  assert.equal(matchesAanvraagFilter(row, "review"), true);
  assert.equal(defaultProductFitForSource("domain_landingspage"), "REVIEW_REQUIRED");
});

test("STANDARD_FIT vult standaardregels, CUSTOM_FIT forceert geen €995", () => {
  const standard = proposalLinesForFit("STANDARD_FIT");
  assert.ok(standard.some((line) => line.title === products.website.name));
  assert.ok(standard.some((line) => line.amount_label === products.website.price));
  assert.ok(standard.some((line) => line.title === products.beheer.name));
  assert.ok(!standard.some((line) => /\b995\b/.test(line.amount_label)));

  const custom = proposalLinesForFit("CUSTOM_FIT");
  assert.ok(custom.length >= 1);
  assert.ok(custom.every((line) => !line.amount_label));
  assert.ok(!custom.some((line) => /\b995\b/.test(`${line.amount_label} ${line.title} ${line.description}`)));
});

test("hergebruikt een zojuist gemaakte handmatige aanvraag", () => {
  const now = Date.parse("2026-09-16T20:00:00.000Z");
  const rows = [
    {
      email: "eva@fluweel.nl",
      company_name: "Fluweel Events",
      created_at: "2026-09-16T19:59:50.000Z",
      source: "MANUAL",
    },
  ];
  const hit = recentManualDuplicate(rows, { email: "eva@fluweel.nl", company: "Fluweel Events" }, now);
  assert.equal(hit?.email, "eva@fluweel.nl");
  assert.equal(recentManualDuplicate(rows, { email: "eva@fluweel.nl", company: "Fluweel Events" }, now + 20_000), null);
});

test("admin toont domein, bod en website-interesse uit de payload", () => {
  const fields = domainAanvraagFields({
    source: "domain_landingspage",
    website: "voorbeeld.nl",
    request_detail: "Bod",
    functionality: "€ 2.500",
    scale: "website-interesse",
    notes: "Graag reageren",
    payload: {
      source: "domain_landingspage",
      domain: "voorbeeld.nl",
      intent: "bid",
      bid_amount: 2500,
      wants_website: true,
    },
  });
  assert.ok(fields);
  assert.equal(fields.find((item) => item[0] === "Domein")?.[1], "voorbeeld.nl");
  assert.equal(fields.find((item) => item[0] === "Aanvraag")?.[1], "Bod");
  assert.equal(fields.find((item) => item[0] === "Website interesse")?.[1], "Ja");
  assert.equal(domainAanvraagFields({ ...fluweel, notes: null, request_detail: null, functionality: null, scale: null }), null);
});

test("mapt live voorstelstatus naar de aanvraagweergave", () => {
  assert.equal(mapLiveProposalStatus("READY"), "DRAFT");
  assert.equal(mapLiveProposalStatus("VIEWED"), "SENT");
  assert.equal(mapLiveProposalStatus("QUESTION"), "SENT");
  assert.equal(mapLiveProposalStatus("ACCEPTED"), "ACCEPTED");
  assert.equal(mapLiveProposalStatus("DECLINED"), "REJECTED");
  assert.equal(mapLiveProposalStatus("onbekend"), null);
});

test("toont alleen vervallen aanvraagacties die nog openstaan", () => {
  const due = {
    next_action: "Voorstel maken",
    next_action_at: "2026-09-19T10:00:00.000Z",
    status: "QUALIFIED",
  };
  assert.equal(isDueRequestAction(due, Date.parse("2026-09-20T10:00:00.000Z")), true);
  assert.equal(isDueRequestAction({ ...due, status: "OMGEZET" }, Date.parse("2026-09-20T10:00:00.000Z")), false);
  assert.equal(isDueRequestAction({ ...due, next_action: "" }, Date.parse("2026-09-20T10:00:00.000Z")), false);
  assert.equal(isDueRequestAction({ ...due, next_action_at: "2026-09-21T10:00:00.000Z" }, Date.parse("2026-09-20T10:00:00.000Z")), false);
});

test("een tweede draft voor dezelfde aanvraag wordt hergebruikt", () => {
  const proposals = [
    { inbound_lead_id: "lead-1", status: "DRAFT", id: "draft-1" },
    { inbound_lead_id: "lead-1", status: "SENT", id: "sent-1" },
  ];
  assert.equal(existingDraftProposal(proposals, "lead-1")?.id, "draft-1");
  assert.equal(existingDraftProposal(proposals, "lead-2"), null);
});
