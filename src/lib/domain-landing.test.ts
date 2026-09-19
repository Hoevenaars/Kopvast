import assert from "node:assert/strict";
import test from "node:test";
import {
  DOMAIN_LANDING_SOURCE,
  domainLandingRedirectUrl,
  domainLeadDetails,
  formatBidAmount,
  isDomainLandingSource,
  isKopvastAppHost,
  parkedDomainFromHost,
  parseBidAmount,
  parseDomainIntent,
  parseDomainParam,
} from "./domain-landing";

test("herkent de domeinlandingsbron", () => {
  assert.equal(isDomainLandingSource(DOMAIN_LANDING_SOURCE), true);
  assert.equal(isDomainLandingSource("website-aanvraag"), false);
});

test("normaliseert de domain-queryparameter veilig", () => {
  assert.equal(parseDomainParam("voorbeeld.nl"), "voorbeeld.nl");
  assert.equal(parseDomainParam("https://www.Voorbeeld.nl/pad?x=1"), "voorbeeld.nl");
  assert.equal(parseDomainParam("javascript:alert(1)"), null);
  assert.equal(parseDomainParam("localhost"), null);
  assert.equal(parseDomainParam("niet geldig"), null);
  assert.equal(parseDomainParam(""), null);
});

test("parst intent en bedrag in euro", () => {
  assert.equal(parseDomainIntent("bid"), "bid");
  assert.equal(parseDomainIntent("PrijsAanvraag"), "price");
  assert.equal(parseDomainIntent("anders"), null);
  const emptyBid = parseBidAmount("");
  assert.equal(emptyBid.ok, true);
  assert.equal(emptyBid.ok ? emptyBid.amount : null, null);
  assert.deepEqual(parseBidAmount("1500"), { ok: true, amount: 1500 });
  assert.deepEqual(parseBidAmount("1.500"), { ok: true, amount: 1500 });
  assert.deepEqual(parseBidAmount("€ 1.250,50"), { ok: true, amount: 1250.5 });
  assert.equal(parseBidAmount("abc").ok, false);
  assert.equal(parseBidAmount("0").ok, false);
  assert.match(formatBidAmount(1500), /€\s*1.500/);
});

test("stuurt geparkeerde domeinen met 307-doel naar /domein", () => {
  assert.equal(isKopvastAppHost("kopvast.nl"), true);
  assert.equal(isKopvastAppHost("www.kopvast.nl"), true);
  assert.equal(isKopvastAppHost("scout.kopvast.nl"), true);
  assert.equal(isKopvastAppHost("kopvast-git-main.vercel.app"), true);
  assert.equal(isKopvastAppHost("localhost:43127"), true);
  assert.equal(isKopvastAppHost("voorbeeld.nl"), false);
  assert.equal(parkedDomainFromHost("www.anderedomein.nl"), "anderedomein.nl");
  assert.equal(
    domainLandingRedirectUrl("voorbeeld.nl", "https://kopvast.nl"),
    "https://kopvast.nl/domein?domain=voorbeeld.nl"
  );
  assert.equal(domainLandingRedirectUrl("kopvast.nl", "https://kopvast.nl"), null);
});

test("zet formulierdetails klaar voor mail en inbound payload", () => {
  assert.deepEqual(
    domainLeadDetails({ domain: "voorbeeld.nl", intent: "price", wantsWebsite: false }),
    {
      Domein: "voorbeeld.nl",
      Type: "Prijsaanvraag",
      "Website interesse": "Nee",
    }
  );
  const bid = domainLeadDetails({
    domain: "voorbeeld.nl",
    intent: "bid",
    bidAmount: 2500,
    wantsWebsite: true,
  });
  assert.equal(bid.Type, "Bod");
  assert.equal(bid["Website interesse"], "Ja");
  assert.match(bid.Bod ?? "", /€\s*2.500/);
});
