import assert from "node:assert/strict";
import test from "node:test";
import { scanWebsite } from "./scan";

test("een onbekend domein krijgt een bereikbaarheidsstatus zonder systeemfout", async () => {
  const result = await scanWebsite("release-check-onbereikbaar.invalid");
  assert.equal(result.status, "unreachable");
  if (result.status !== "unreachable") return;
  assert.match(result.message, /niet bereikbaar/);
  assert.doesNotMatch(result.message, /getaddrinfo|ENOTFOUND/i);
});
