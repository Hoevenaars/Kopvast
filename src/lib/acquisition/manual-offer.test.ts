import assert from "node:assert/strict";
import test from "node:test";
import { fallbackAcquisitionMail } from "../acquisition-mail";
import { findingsFromManualReasons, parseManualReasonCategories } from "./manual-reasons";
import { applyManualOfferToMailBody, paragraphForManualDiscount } from "./manual-offer";

function sampleBody() {
  const parsed = parseManualReasonCategories(["visual", "conversion"]);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("reden");
  return fallbackAcquisitionMail({
    companyName: "Brasserie Charley",
    domain: "brasseriecharley.nl",
    fit: "STANDARD_FIT",
    findings: findingsFromManualReasons(parsed.categories),
    place: "Amsterdam",
  }).body;
}

test("handmatige plaatsreden zet de €995-alinea in een mail zonder automatische korting", () => {
  const body = sampleBody();
  assert.match(body, /€1\.495/);
  assert.doesNotMatch(body, /€995/);

  const offer = paragraphForManualDiscount({
    geographicReason: "GROESBEEK",
    contentReason: "LOCAL_ENTREPRENEURSHIP",
  });
  assert.equal(offer.discounted, true);
  assert.match(offer.paragraph, /Groesbekers/);
  assert.match(offer.paragraph, /ondernemers/);

  const applied = applyManualOfferToMailBody(body, offer.paragraph);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.match(applied.body, /€995 excl\. btw/);
  assert.match(applied.body, /prijs=995/);
  assert.doesNotMatch(applied.body, /prijs=1495/);
  assert.match(applied.body, /Twee dingen vielen direct op/);
  assert.match(applied.body, /eerste indruk kan sterker/);
});

test("zonder reden blijft de normale prijs staan", () => {
  const offer = paragraphForManualDiscount({ geographicReason: null, contentReason: null });
  assert.equal(offer.discounted, false);
  assert.match(offer.paragraph, /€1\.495/);
  assert.doesNotMatch(offer.paragraph, /€995/);

  const discounted = paragraphForManualDiscount({
    geographicReason: "REGION_NIJMEGEN",
    contentReason: null,
  });
  const withDiscount = applyManualOfferToMailBody(sampleBody(), discounted.paragraph);
  assert.equal(withDiscount.ok, true);
  if (!withDiscount.ok) return;
  const restored = applyManualOfferToMailBody(withDiscount.body, offer.paragraph);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.match(restored.body, /kost €1\.495 excl\. btw/);
  assert.doesNotMatch(restored.body, /€995/);
  assert.match(restored.body, /prijs=1495/);
});

test("scherpe uitzondering is alleen de launch-reden", () => {
  const offer = paragraphForManualDiscount({
    geographicReason: null,
    contentReason: null,
    allowLaunchOffer: true,
  });
  assert.equal(offer.discounted, true);
  assert.match(offer.paragraph, /scherpe uitzondering/);
  assert.equal(offer.reasonLines.length, 1);
});

test("een mail zonder prijsalinea krijgt geen korting", () => {
  const applied = applyManualOfferToMailBody("Goedendag,\n\nAlleen een opening.", "Een complete Kopvast Website kost €1.495 excl. btw.");
  assert.equal(applied.ok, false);
});
