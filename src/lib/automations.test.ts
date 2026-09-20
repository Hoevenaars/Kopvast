import assert from "node:assert/strict";
import test from "node:test";
import { laneStatus } from "./automations";

test("automation lanes vragen aandacht zodra er items in staan", () => {
  assert.equal(laneStatus(0), "ok");
  assert.equal(laneStatus(2), "attention");
});
