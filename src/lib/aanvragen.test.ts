import assert from "node:assert/strict";
import test from "node:test";
import {
  bronLabel,
  domainFromWebsite,
  existingDraftProposal,
  inferredProductFit,
  matchesAanvraagFilter,
  matchesAanvraagSearch,
  proposalLinesForFit,
  recentManualDuplicate,
  requestBron,
  defaultProductFitForSource,
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
  assert.equal(requestBron({ source: "kopvast", payload: { source: "website-aanvraag" } }), "Websiteformulier");
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

test("een tweede draft voor dezelfde aanvraag wordt hergebruikt", () => {
  const proposals = [
    { inbound_lead_id: "lead-1", status: "DRAFT", id: "draft-1" },
    { inbound_lead_id: "lead-1", status: "SENT", id: "sent-1" },
  ];
  assert.equal(existingDraftProposal(proposals, "lead-1")?.id, "draft-1");
  assert.equal(existingDraftProposal(proposals, "lead-2"), null);
});
