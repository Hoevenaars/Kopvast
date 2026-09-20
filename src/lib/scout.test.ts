import assert from "node:assert/strict";
import test from "node:test";
import { parseOptionalManualEmail, pickLeadEmail } from "./contact-email";
import { extractUrlFromShare, inferSource, parseScoutUrl } from "./scout/urls";
import { findingsFromFacts, heuristicScores, type PageFacts } from "./scout/scanner";
import { fallbackCommercialCopy } from "./scout/ai";
import { sendApprovedOutreach } from "./scout/resend";
import { isScoutHostname, originAllowed } from "./scout/config";

test("normaliseert www, protocol en hoofddomein", () => {
  const parsed = parseScoutUrl("www.Bedrijf.nl/contact");
  assert.equal(parsed.domain, "bedrijf.nl");
  assert.equal(parsed.url.protocol, "https:");
  const again = parseScoutUrl("bedrijf.nl");
  assert.equal(again.domain, parsed.domain);
});

test("haalt URL uit share-tekst", () => {
  assert.equal(extractUrlFromShare({ text: "Kijk eens https://atelier.nl/over" })?.includes("atelier.nl"), true);
  assert.equal(inferSource({ source: "share" }), "safari_share");
  assert.equal(inferSource({ source: "camera" }), "camera");
});

test("Kopvast Score blijft een prioritering tussen 0 en 100", () => {
  const facts: PageFacts = {
    url: "https://bedrijf.nl/",
    fetchedUrl: "https://bedrijf.nl/",
    https: true,
    title: "Bedrijf",
    description: "Korte omschrijving van het aanbod van dit bedrijf in Nederland.",
    canonical: "https://bedrijf.nl/",
    viewport: "width=device-width",
    lang: "nl",
    h1: "Welkom",
    jsonLd: [],
    emails: ["info@bedrijf.nl"],
    phones: ["0101234567"],
    linkedin: null,
    forms: 1,
    mailto: true,
    tel: true,
    ctaHints: ["Offerte"],
    ogTitle: "Bedrijf",
    ogImage: "https://bedrijf.nl/og.png",
    robotsMeta: null,
    images: 2,
    imagesMissingAlt: 0,
    wordCount: 240,
    headings: ["Welkom"],
    internalLinks: [],
    brokenSample: [],
    htmlBytes: 12000,
  };
  const scores = heuristicScores(facts, findingsFromFacts(facts));
  assert.ok(scores.overall >= 0 && scores.overall <= 100);
  assert.ok(scores.technical >= 50);
});

test("acquisitieconcept gebruikt notitie als context, niet als feit", () => {
  const copy = fallbackCommercialCopy({
    companyName: "Atelier Lint",
    domain: "atelierlint.nl",
    note: "Prachtige nieuwe showroom. Website ziet er behoorlijk oud uit.",
    facts: { forms: 0, mailto: false, tel: false } as PageFacts,
    findings: [],
  });
  assert.match(copy.why_interesting, /Persoonlijke observatie/);
  assert.match(copy.draftMessage, /showroom|notitie|observatie|website/i);
  assert.doesNotMatch(copy.draftMessage, /wij maken websites en willen graag kennismaken/i);
});

test("Resend-versturen blijft uit", async () => {
  const result = await sendApprovedOutreach({
    to: "info@bedrijf.nl",
    subject: "Test",
    html: "<p>x</p>",
    idempotencyKey: "scout-test/1",
  });
  assert.equal(result.ok, false);
});

test("productie-origin is scout.kopvast.nl en niet een wildcard vercel.app", () => {
  assert.equal(isScoutHostname("scout.kopvast.nl"), true);
  assert.equal(isScoutHostname("kopvast.nl"), false);
  process.env.NEXT_PUBLIC_APP_URL = "https://scout.kopvast.nl";
  assert.equal(originAllowed("https://scout.kopvast.nl"), true);
  assert.equal(originAllowed("https://random.vercel.app"), false);
});

test("een later gevonden mailadres overschrijft een handmatig adres niet", () => {
  assert.equal(pickLeadEmail("via.google@atelier.nl", "info@atelier.nl"), "via.google@atelier.nl");
  assert.deepEqual(parseOptionalManualEmail(""), { ok: true, email: null });
});

test("Scout-push krijgt een admin-prospectstatus zonder afwijzen", async () => {
  const { mergeScoutNote, prospectStatusFromScout, scoutSourceLabel } = await import("./scout/crm-map");
  assert.equal(prospectStatusFromScout("scannen", null), "SCANNING");
  assert.equal(prospectStatusFromScout("scan_mislukt", 12), "SCAN_FAILED");
  assert.equal(prospectStatusFromScout("concept_klaar", 40), "WATCHLIST");
  assert.equal(prospectStatusFromScout("concept_klaar", 82), "SALES_READY");
  assert.equal(prospectStatusFromScout("benaderd", 40), "CONTACTED");
  assert.equal(prospectStatusFromScout("reactie", 90), "CONTACTED");
  assert.equal(scoutSourceLabel("safari_share"), "Deelblad");
  assert.equal(mergeScoutNote(null, "Nieuwe showroom"), "Nieuwe showroom");
  assert.equal(mergeScoutNote("Nieuwe showroom", "Nieuwe showroom"), "Nieuwe showroom");
  assert.match(mergeScoutNote("Bestaande notitie", "Nieuwe showroom") ?? "", /Scout: Nieuwe showroom/);
});
