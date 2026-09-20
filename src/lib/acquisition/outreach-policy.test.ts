import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONAL_APPROACH_DISCOUNT_RULES,
  PERSONAL_APPROACH_MAIL_RULES,
  explainOutreachOffer,
} from "./outreach-policy";

test("spelregels blijven zichtbaar als vaste copy", () => {
  assert.ok(PERSONAL_APPROACH_MAIL_RULES.some((item) => /website zelf kort/.test(item)));
  assert.ok(PERSONAL_APPROACH_DISCOUNT_RULES.some((item) => /€995/.test(item)));
  assert.ok(PERSONAL_APPROACH_DISCOUNT_RULES.some((item) => /Groesbeek/.test(item)));
});

test("standaard fit in Groesbeek toont persoonlijke korting", () => {
  const view = explainOutreachOffer({ fit: "STANDARD_FIT", place: "Groesbeek" });
  assert.equal(view.eligible, true);
  assert.match(view.price ?? "", /€995/);
  assert.match(view.text, /Groesbekers/);
  assert.deepEqual(view.reasonLabels, ["Groesbeek"]);
});

test("standaard fit buiten de regio krijgt geen automatische korting", () => {
  const view = explainOutreachOffer({ fit: "STANDARD_FIT", place: "Amsterdam" });
  assert.equal(view.eligible, false);
  assert.match(view.price ?? "", /1\.495/);
  assert.match(view.text, /spelregels/);
  assert.equal(view.reasonLabels.length, 0);
});

test("maatwerk blijft zonder €995", () => {
  const view = explainOutreachOffer({ fit: "CUSTOM_FIT", place: "Groesbeek" });
  assert.equal(view.eligible, false);
  assert.equal(view.price, "Op aanvraag");
  assert.doesNotMatch(view.text, /€995/);
});
