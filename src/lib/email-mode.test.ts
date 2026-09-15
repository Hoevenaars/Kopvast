import assert from "node:assert/strict";
import test from "node:test";
import { combineEmailMode, combineTestEmail, recipientForMode } from "./email-mode";

test("buiten productie blijft TEST, tenzij EMAIL_MODE=LIVE", () => {
  assert.equal(combineEmailMode({ nodeEnv: "development", settings: "LIVE", env: "TEST" }), "TEST");
  assert.equal(combineEmailMode({ nodeEnv: "development", settings: "LIVE" }), "TEST");
  assert.equal(combineEmailMode({ nodeEnv: "development", env: "LIVE" }), "LIVE");
});

test("in productie wint app_settings van de env-fallback", () => {
  assert.equal(combineEmailMode({ nodeEnv: "production", settings: "LIVE", env: "TEST" }), "LIVE");
  assert.equal(combineEmailMode({ nodeEnv: "production", settings: "TEST", env: "LIVE" }), "TEST");
  assert.equal(combineEmailMode({ nodeEnv: "production", settings: null, env: "LIVE" }), "LIVE");
  assert.equal(combineEmailMode({ nodeEnv: "production", settings: null, env: "TEST" }), "TEST");
  assert.equal(combineEmailMode({ nodeEnv: "production" }), "TEST");
});

test("testadres komt eerst uit settings, daarna env", () => {
  assert.equal(combineTestEmail({ settings: "intern@kopvast.nl", env: "ander@kopvast.nl" }), "intern@kopvast.nl");
  assert.equal(combineTestEmail({ settings: "  ", env: "ander@kopvast.nl" }), "ander@kopvast.nl");
  assert.match(combineTestEmail({}), /@kopvast\.nl/);
});

test("LIVE stuurt naar de prospect, TEST naar het testadres", () => {
  assert.deepEqual(recipientForMode("eva@bedrijf.nl", "TEST", "contact@kopvast.nl"), {
    to: "contact@kopvast.nl",
    mode: "TEST",
    intended: "eva@bedrijf.nl",
  });
  assert.deepEqual(recipientForMode("eva@bedrijf.nl", "LIVE", "contact@kopvast.nl"), {
    to: "eva@bedrijf.nl",
    mode: "LIVE",
    intended: "eva@bedrijf.nl",
  });
});
