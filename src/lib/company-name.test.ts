import assert from "node:assert/strict";
import test from "node:test";
import {
  brandFromDomain,
  isGenericCompanyName,
  parseManualCompanyName,
  pickStoredCompanyName,
  preferredCompanyName,
  replaceCompanyNameInText,
} from "./company-name";
import { enrichFromFacts } from "./scout/enrichment";
import type { PageFacts } from "./scout/scanner";

test("paginatitel Klusbedrijf wordt geen bedrijfsnaam voor bouwkabouter.nl", () => {
  const name = preferredCompanyName({
    jsonLdName: "Klusbedrijf",
    title: "Klusbedrijf",
    ogTitle: "Klusbedrijf",
    domain: "bouwkabouter.nl",
  });
  assert.equal(name?.value, "Bouwkabouter");
  assert.equal(isGenericCompanyName("Klusbedrijf"), true);
  assert.equal(isGenericCompanyName("Bouwkabouter"), false);
  assert.equal(brandFromDomain("www.atelier-lint.nl"), "Atelier Lint");
});

test("een handmatig gezette naam blijft staan, een generieke titel niet", () => {
  assert.equal(pickStoredCompanyName("Bouwkabouter", "Bouw Kabouter"), "Bouw Kabouter");
  assert.equal(pickStoredCompanyName("Bouwkabouter", "Klusbedrijf"), "Bouwkabouter");
  assert.equal(pickStoredCompanyName("Klusbedrijf", ""), "Klusbedrijf");
  assert.equal(parseManualCompanyName("  De Bouwkabouters  ").ok, true);
  assert.equal(parseManualCompanyName("   ").ok, false);
});

test("vervangt de oude naam in conceptmail", () => {
  const subject = replaceCompanyNameInText("Korte observatie over Klusbedrijf", "Klusbedrijf", "Bouwkabouter");
  assert.equal(subject, "Korte observatie over Bouwkabouter");
  assert.equal(replaceCompanyNameInText("Hallo", "Klusbedrijf", "Bouwkabouter"), "Hallo");
});

test("Scout-enrichment neemt het domein als de titel generiek is", () => {
  const facts = {
    fetchedUrl: "https://www.bouwkabouter.nl/",
    title: "Klusbedrijf",
    ogTitle: "Klusbedrijf",
    h1: "Welkom",
    jsonLd: [{ "@type": "LocalBusiness", name: "Klusbedrijf" }],
    emails: [],
    phones: [],
    linkedin: null,
    description: "De Bouwkabouters uw bouwbedrijf uit Nijmegen.",
    canonical: "https://www.bouwkabouter.nl",
  } as unknown as PageFacts;
  const enrichment = enrichFromFacts(facts);
  assert.equal(enrichment.company_name.value, "Bouwkabouter");
});
