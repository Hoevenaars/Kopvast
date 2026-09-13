import assert from "node:assert/strict";
import test from "node:test";
import {
  domainFromUrl,
  mapKopvastFindings,
  parseAiAnalysis,
  recommendationToStatus,
} from "./acquire-map";

test("knipt www van het domein", () => {
  assert.equal(domainFromUrl("https://www.Voorbeeld.nl/pad"), "voorbeeld.nl");
});

test("zet Kopvast-bevindingen om naar Refresh-velden", () => {
  const mapped = mapKopvastFindings([
    {
      id: "title",
      kind: "feit",
      title: "De titelbalk vertelt te weinig",
      detail: "Geen scherpe belofte.",
      evidence: "Huidige titel: “Home”",
    },
    {
      id: "contact",
      kind: "observatie",
      title: "Aanvragen hebben geen duidelijke route",
      detail: "Geen formulier gevonden.",
      evidence: "Geen form of mailto.",
    },
  ]);

  assert.equal(mapped[0].finding_type, "FACT");
  assert.equal(mapped[0].category, "seo");
  assert.equal(mapped[1].finding_type, "OBSERVATION");
  assert.equal(mapped[1].category, "conversion");
  assert.equal(mapped[1].severity, "critical");
});

test("vertaalt AI-advies naar prospectstatus", () => {
  assert.equal(recommendationToStatus("priority"), "PRIORITY");
  assert.equal(recommendationToStatus("reject"), "REJECTED");
  assert.equal(recommendationToStatus("onbekend"), "NEW");
});

test("parseert een geldige AI-analyse", () => {
  const parsed = parseAiAnalysis({
    industry: "trouwlocatie",
    industry_confidence: 0.8,
    city: "Nijmegen",
    country: "NL",
    company_size_estimate: "2-5",
    company_size_confidence: 0.5,
    visual_score: 62,
    conversion_score: 40,
    content_score: 55,
    likely_customer_value: "medium",
    website_importance_for_acquisition: "high",
    commercial_fit: 18,
    commercial_fit_reason: "Lokale dienst met website als eerste indruk.",
    language: "nl",
    unsupported_language: false,
    site_recent_and_high_quality: false,
    recommendation: "qualified",
    findings: [
      {
        type: "OBSERVATION",
        category: "conversion",
        severity: "important",
        title: "Aanvraag ligt verstopt",
        description: "De homepage maakt de volgende stap niet meteen duidelijk.",
        confidence: 0.7,
        evidence_reference: "no primary cta",
      },
    ],
  });

  assert.ok(parsed);
  assert.equal(parsed?.recommendation, "qualified");
  assert.equal(parsed?.findings.length, 1);
});

test("wijst een ongeldige AI-analyse af", () => {
  assert.equal(parseAiAnalysis({ recommendation: "maybe" }), null);
  assert.equal(parseAiAnalysis(null), null);
});
