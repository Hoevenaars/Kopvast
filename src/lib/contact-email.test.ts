import assert from "node:assert/strict";
import test from "node:test";
import {
  parseManualEmail,
  parseOptionalManualEmail,
  pickLeadEmail,
  withManualEmailEnrichment,
} from "./contact-email";
import { emptyEnrichment } from "./scout/types";

test("handmatig e-mailadres wordt genormaliseerd", () => {
  const parsed = parseManualEmail("  Info@Bedrijf.nl ");
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.email, "info@bedrijf.nl");
});

test("leeg of ongeldig e-mailadres wordt geweigerd", () => {
  assert.equal(parseManualEmail("").ok, false);
  const invalid = parseManualEmail("geen-mail");
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.message, /e-mail/);
});

test("optioneel e-mail mag leeg blijven", () => {
  assert.deepEqual(parseOptionalManualEmail("  "), { ok: true, email: null });
  assert.deepEqual(parseOptionalManualEmail(undefined), { ok: true, email: null });
  const filled = parseOptionalManualEmail("hello@atelier.nl");
  assert.equal(filled.ok, true);
  if (filled.ok) assert.equal(filled.email, "hello@atelier.nl");
});

test("handmatig e-mailadres blijft staan als de scan niets of iets anders vindt", () => {
  assert.equal(pickLeadEmail("info@bedrijf.nl", null), "info@bedrijf.nl");
  assert.equal(pickLeadEmail(null, "hello@bedrijf.nl"), "hello@bedrijf.nl");
  assert.equal(pickLeadEmail("info@bedrijf.nl", "other@bedrijf.nl"), "info@bedrijf.nl");
  assert.equal(pickLeadEmail("  ", null), null);
});

test("handmatig e-mailadres komt in de enrichment te staan", () => {
  const next = withManualEmailEnrichment(emptyEnrichment(), "info@bedrijf.nl");
  assert.equal(next.email.value, "info@bedrijf.nl");
  assert.equal(next.email.kind, "found");
});
