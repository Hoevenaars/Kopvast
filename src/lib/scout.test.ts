import assert from "node:assert/strict";
import test from "node:test";
import { parseOptionalManualEmail, pickLeadEmail } from "./contact-email";
import { extractUrlFromShare, inferSource, parseScoutUrl } from "./scout/urls";
import { findingsFromFacts, heuristicScores, type PageFacts } from "./scout/scanner";
import { fallbackCommercialCopy } from "./scout/ai";
import { buildPersonalApproachLetter } from "./acquisition/outreach-policy";
import { CONTENT_REASON_PRIORITY } from "./acquisition/special-offer-rules";
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
  assert.doesNotMatch(copy.draftMessage, /showroom/);
  assert.match(copy.draftMessage, /Zal ik een keer kort laten zien/);
  assert.doesNotMatch(copy.draftMessage, /€|995|korting|pakket/i);
  assert.doesNotMatch(copy.draftMessage, /wij maken websites en willen graag kennismaken/i);
});

test("Scout en Admin maken bij gelijke input dezelfde eerste mail", () => {
  const places = [
    { place: "Groesbeek", municipality: "Berg en Dal" },
    { place: "Persingen", municipality: "Berg en Dal" },
    { place: "Nijmegen", municipality: "Nijmegen" },
  ];
  for (const item of places) {
    const admin = buildPersonalApproachLetter({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      place: item.place,
      municipality: item.municipality,
    });
    const scout = fallbackCommercialCopy({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      note: "Mooie zaak, maar dat is nog geen bewijs.",
      facts: { forms: 0, mailto: false, tel: false } as PageFacts,
      findings: [],
      place: item.place,
    });
    assert.equal(scout.draftSubject, admin.subject);
    assert.equal(scout.draftMessage, admin.body);
    assert.doesNotMatch(scout.draftMessage, /Mooie zaak/);
  }

  for (const reason of CONTENT_REASON_PRIORITY) {
    const evidence = [
      {
        reason,
        evidence: `Het controleerbare feit voor ${reason} staat op de eigen pagina.`,
        confidence: 0.9,
        sourceUrl: "https://voorbeeld.nl/over",
        sourceKind: "website" as const,
      },
    ];
    const admin = buildPersonalApproachLetter({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      place: "Amsterdam",
      contentEvidence: evidence,
    });
    const scout = fallbackCommercialCopy({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      note: null,
      facts: { forms: 1, mailto: true, tel: true } as PageFacts,
      findings: [],
      place: "Amsterdam",
      contentEvidence: evidence,
    });
    assert.equal(scout.draftMessage, admin.body);
    assert.equal(admin.openingAxis, "content");
    assert.doesNotMatch(admin.body, /€/);
  }

  const empty = buildPersonalApproachLetter({
    companyName: "Voorbeeld Organisatie",
    domain: "voorbeeld.nl",
    place: "Amsterdam",
  });
  const scoutEmpty = fallbackCommercialCopy({
    companyName: "Voorbeeld Organisatie",
    domain: "voorbeeld.nl",
    note: null,
    facts: { forms: 0, mailto: false, tel: false } as PageFacts,
    findings: [],
    place: "Amsterdam",
  });
  assert.equal(empty.sufficient, false);
  assert.equal(scoutEmpty.draftMessage, empty.body);
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
  assert.equal(prospectStatusFromScout("nieuw", null, { hasWebsite: false }), "NEW");
  assert.equal(prospectStatusFromScout("concept_klaar", null, { hasWebsite: false }), "NEW");
  assert.equal(scoutSourceLabel("safari_share"), "Deelblad");
  assert.equal(mergeScoutNote(null, "Nieuwe showroom"), "Nieuwe showroom");
  assert.equal(mergeScoutNote("Nieuwe showroom", "Nieuwe showroom"), "Nieuwe showroom");
  assert.match(mergeScoutNote("Bestaande notitie", "Nieuwe showroom") ?? "", /Scout: Nieuwe showroom/);
});

test("bedrijf zonder website krijgt een mail zonder scan, score of prijs", async () => {
  const { scoutServiceClient } = await import("./scout/auth");
  if (scoutServiceClient()) return;
  const { insertLead, getLeadById, getDraft, latestScan, findLeadWithoutWebsite } = await import("./scout/leads");
  const { runLeadPipeline } = await import("./scout/pipeline");
  const { rescanScoutLead } = await import("./scout/capture");
  const { containsInternalAcquisitionInstruction } = await import("./acquisition/outreach-policy");
  const user = { id: "scout-no-site-test", email: "test@kopvast.nl" };
  const lead = await insertLead({
    user,
    url: "",
    domain: "",
    canonicalUrl: null,
    note: "Persoonlijke notitie",
    email: "bakkerij-test@example.com",
    company: "Bakkerij Zonder Site",
    contactName: "Jan Bakker",
    phone: "06-12345678",
    facebookUrl: "https://www.facebook.com/bakkerijzondersite",
    socialUrl: "https://www.instagram.com/bakkerij",
    sourceUrl: null,
    source: "scout_manual",
  });
  await runLeadPipeline(lead.id);
  const stored = await getLeadById(lead.id);
  assert.equal(stored?.status, "concept_klaar");
  assert.equal(stored?.score, null);
  assert.equal(stored?.domain, "");
  assert.equal(stored?.first_name, "Jan");
  assert.equal(stored?.last_name, "Bakker");
  assert.equal(stored?.phone, "0612345678");
  assert.equal(stored?.facebook_url, "https://www.facebook.com/bakkerijzondersite");
  assert.equal(stored?.social_url, "https://www.instagram.com/bakkerij");
  assert.equal(await latestScan(lead.id), null);
  const draft = await getDraft(lead.id);
  assert.match(draft?.message ?? "", /^Hoi Jan,/);
  assert.match(draft?.message ?? "", /nog geen eigen website/i);
  assert.equal(containsInternalAcquisitionInstruction(draft?.message ?? ""), false);
  assert.doesNotMatch(draft?.message ?? "", /€|995|1\.495|lighthouse|opportunity score/i);
  const duplicate = await findLeadWithoutWebsite(user.id, "bakkerij-test@example.com", "Bakkerij Zonder Site");
  assert.equal(duplicate?.id, lead.id);
  const rescan = await rescanScoutLead({ user, leadId: lead.id });
  assert.equal(rescan.ok, false);
});
