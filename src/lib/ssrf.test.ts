import assert from "node:assert/strict";
import test from "node:test";
import { isBlockedHostname, isBlockedIp, isPrivateIPv4, normalizeWebsiteUrl } from "./ssrf";

test("blokkeert localhost en private IP's", () => {
  assert.equal(isPrivateIPv4("127.0.0.1"), true);
  assert.equal(isPrivateIPv4("10.0.0.4"), true);
  assert.equal(isPrivateIPv4("192.168.1.1"), true);
  assert.equal(isPrivateIPv4("169.254.169.254"), true);
  assert.equal(isPrivateIPv4("8.8.8.8"), false);
  assert.equal(isBlockedIp("::1"), true);
  assert.equal(isBlockedIp("fc00::1"), true);
});

test("normaliseert publieke https-URL's", () => {
  const url = normalizeWebsiteUrl("voorbeeld.nl/path");
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "voorbeeld.nl");
});

test("wijst gevaarlijke adressen af", () => {
  assert.throws(() => normalizeWebsiteUrl("localhost"), /niet toegestaan|geldig/i);
  assert.throws(() => normalizeWebsiteUrl("http://127.0.0.1"), /niet toegestaan/);
  assert.throws(() => normalizeWebsiteUrl("ftp://voorbeeld.nl"), /http/);
  assert.throws(() => normalizeWebsiteUrl("http://169.254.169.254/"), /niet toegestaan/);
  assert.throws(() => normalizeWebsiteUrl("http://metadata.google.internal/"), /niet toegestaan/);
  assert.throws(() => normalizeWebsiteUrl("http://2130706433/"), /niet toegestaan/);
  assert.throws(() => normalizeWebsiteUrl("http://user:pass@voorbeeld.nl"), /niet toegestaan/);
  assert.ok(isBlockedHostname("kubernetes.default.svc"));
});
