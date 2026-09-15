import assert from "node:assert/strict";
import test from "node:test";
import {
  CLEAR_ACQUISITION_CONFIRM,
  LIVE_MODE_CONFIRM,
  TEST_MODE_CONFIRM,
  matchesConfirm,
} from "./acquisition-ops";

test("bevestigingswoorden zijn bewust, niet hoofdlettergevoelig", () => {
  assert.equal(matchesConfirm("live", LIVE_MODE_CONFIRM), true);
  assert.equal(matchesConfirm("  LIVE  ", LIVE_MODE_CONFIRM), true);
  assert.equal(matchesConfirm("test", TEST_MODE_CONFIRM), true);
  assert.equal(matchesConfirm("leegmaken", CLEAR_ACQUISITION_CONFIRM), true);
  assert.equal(matchesConfirm("leeg", CLEAR_ACQUISITION_CONFIRM), false);
  assert.equal(matchesConfirm("LIVE", TEST_MODE_CONFIRM), false);
});
