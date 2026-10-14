import assert from "node:assert/strict";
import test from "node:test";
import { fallbackAcquisitionMail } from "../acquisition-mail";
import { MAIL_PROMPT_VERSION } from "../acquisition-constants";
import { evaluatePreSend } from "../acquisition-send";
import { personalMailWordCount } from "./outreach-policy";
import {
  buildSpecialOffer,
  CONTENT_CONFIDENCE_THRESHOLD,
  CONTENT_REASON_PRIORITY,
  selectPersonalApproach,
  type ContentOfferReason,
  type OfferEvidence,
} from "./special-offer-rules";

const CONTENT_PHRASES: Record<Exclude<ContentOfferReason, null>, RegExp> = {
  LOCAL_CONTRIBUTION: /iets toe aan de omgeving/,
  HERITAGE_SPECIAL_PLACE: /bijzondere of historische plek/,
  SMALL_STRONG_ORGANISATION: /kleine organisatie met een sterk verhaal/,
  LOCAL_ENTREPRENEURSHIP: /lokaal gewortelde ondernemer/,
  STRONG_KOPVAST_CASE: /werk dat ik met Kopvast wil laten zien/,
  REGIONAL_TOURISM: /toerisme of recreatie in de regio/,
  CULTURE_OR_HISTORY: /culturele of historische functie/,
};

function evidenceFor(reason: Exclude<ContentOfferReason, null>, confidence = 0.9): OfferEvidence {
  return {
    reason,
    evidence: `Het controleerbare feit voor ${reason} staat op de eigen pagina.`,
    confidence,
    sourceUrl: "https://voorbeeld.nl/over",
    sourceKind: "website",
  };
}

function assertFirstMail(body: string) {
  const words = personalMailWordCount(body);
  assert.ok(words >= 80 && words <= 120, `verwacht 80-120 woorden, kreeg ${words}: ${body}`);
  assert.equal((body.match(/\?/g) ?? []).length, 1);
  assert.doesNotMatch(body, /€|\b995\b|1[.,]495|korting|websitepakket|pakketoverzicht/i);
  assert.doesNotMatch(body, /opportunity score|algoritme|digitale aanwezigheid/i);
}

test("elke inhoudelijke reden kan de opening dragen, zonder prijs", () => {
  for (const reason of CONTENT_REASON_PRIORITY) {
    const mail = fallbackAcquisitionMail({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      fit: "STANDARD_FIT",
      findings: [],
      place: "Amsterdam",
      contentEvidence: [evidenceFor(reason)],
    });
    assert.equal(mail.approach.contentReason, reason);
    assert.equal(mail.approach.geographicReason, null);
    assert.equal(mail.approach.openingAxis, "content");
    assert.match(mail.body, CONTENT_PHRASES[reason]);
    assert.match(mail.body, new RegExp(reason));
    assertFirstMail(mail.body);
    for (const other of CONTENT_REASON_PRIORITY) {
      if (other !== reason) assert.doesNotMatch(mail.body, CONTENT_PHRASES[other]);
    }
  }
});

test("geografische prioriteit blijft Groesbeek, Berg en Dal, regio Nijmegen", () => {
  const cases = [
    { place: "Groesbeek", municipality: "Berg en Dal", reason: "GROESBEEK" as const, phrase: /zelf gevestigd/ },
    { place: "Persingen", municipality: "Berg en Dal", reason: "BERG_EN_DAL" as const, phrase: /eigen gemeente Berg en Dal/ },
    { place: "Nijmegen", municipality: null, reason: "REGION_NIJMEGEN" as const, phrase: /regio Nijmegen/ },
  ];
  for (const item of cases) {
    const mail = fallbackAcquisitionMail({
      companyName: "Voorbeeld Organisatie",
      domain: "voorbeeld.nl",
      fit: "STANDARD_FIT",
      findings: [],
      place: item.place,
      municipality: item.municipality,
    });
    assert.equal(mail.approach.geographicReason, item.reason);
    assert.equal(mail.approach.contentReason, null);
    assert.equal(mail.approach.openingAxis, "geographic");
    assert.match(mail.body, item.phrase);
    assertFirstMail(mail.body);
  }
});

test("hooguit één plaats en één inhoud, en één reden in de opening", () => {
  const mail = fallbackAcquisitionMail({
    companyName: "Kerkje van Persingen",
    domain: "kerkjepersingen.nl",
    fit: "STANDARD_FIT",
    findings: [],
    place: "Groesbeek",
    municipality: "Berg en Dal",
    contentEvidence: CONTENT_REASON_PRIORITY.map((reason) => evidenceFor(reason, 0.8)),
  });
  assert.equal(mail.approach.geographicReason, "GROESBEEK");
  assert.equal(mail.approach.contentReason, "HERITAGE_SPECIAL_PLACE");
  assert.equal(mail.approach.openingAxis, "content");
  assert.match(mail.body, /bijzondere of historische plek/);
  assert.doesNotMatch(mail.body, /Groesbeek|zelf gevestigd|regio Nijmegen/);
  assertFirstMail(mail.body);
});

test("een persoonlijke reden zet geen korting in de eerste mail", () => {
  const input = {
    companyName: "Bakkerij Janssen",
    domain: "bakkerijjanssen.nl",
    fit: "STANDARD_FIT" as const,
    findings: [],
    place: "Groesbeek",
    municipality: "Berg en Dal",
    contentEvidence: [evidenceFor("HERITAGE_SPECIAL_PLACE", 0.95)],
    allowLaunchOffer: true,
  };
  const mail = fallbackAcquisitionMail(input);
  assert.equal(mail.approach.sufficient, true);
  assert.doesNotMatch(mail.body, /€|995|korting|scherpe uitzondering/i);
  const offer = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: input.place,
    municipality: input.municipality,
    contentEvidence: input.contentEvidence,
    allowLaunchOffer: true,
  });
  assert.equal(offer.eligible, true);
  assert.match(offer.offerParagraph, /€995/);
  assert.match(offer.offerParagraph, /€1\.495/);
});

test("onvoldoende bewijs blijft neutraal en verzint geen rol of grootte", () => {
  const weak = selectPersonalApproach({
    place: "Amsterdam",
    contentEvidence: [evidenceFor("SMALL_STRONG_ORGANISATION", CONTENT_CONFIDENCE_THRESHOLD - 0.01)],
  });
  assert.equal(weak.sufficient, false);
  assert.equal(weak.contentReason, null);
  assert.equal(weak.geographicReason, null);

  const exact = selectPersonalApproach({
    place: "Amsterdam",
    contentEvidence: [evidenceFor("CULTURE_OR_HISTORY", CONTENT_CONFIDENCE_THRESHOLD)],
  });
  assert.equal(exact.contentReason, "CULTURE_OR_HISTORY");
  assert.equal(exact.openingAxis, "content");

  const mail = fallbackAcquisitionMail({
    companyName: "Nova Advies",
    domain: "nova-advies.nl",
    fit: "STANDARD_FIT",
    findings: [],
    place: "Amsterdam",
    contentEvidence: [evidenceFor("LOCAL_CONTRIBUTION", 0.4)],
  });
  assert.equal(mail.approach.sufficient, false);
  assert.match(mail.body, /verzin ik niet/);
  assert.doesNotMatch(mail.body, /kleine organisatie|maatschappelijk|toerisme|historische plek|Groesbeek/);
  assertFirstMail(mail.body);
});

test("NO_WEBSITE gebruikt notitie, project of profiel en claimt geen bekeken website", () => {
  const sources = ["manual_note", "project_description", "company_profile"] as const;
  for (const sourceKind of sources) {
    const mail = fallbackAcquisitionMail({
      companyName: "Bakkerij De Horst",
      domain: "dehorst.example",
      fit: "REVIEW_REQUIRED",
      findings: [],
      place: "Groesbeek",
      websitePresence: "NO_WEBSITE",
      contentEvidence: [
        {
          reason: "LOCAL_ENTREPRENEURSHIP",
          evidence: "Staat elke zaterdag op de weekmarkt in het dorp.",
          confidence: 0.92,
          sourceKind,
        },
      ],
    });
    assert.equal(mail.approach.websitePresence, "NO_WEBSITE");
    assert.equal(mail.approach.sourceKind, sourceKind);
    assert.equal(mail.approach.openingAxis, "content");
    assert.equal(mail.subject, "Even contact over Bakkerij De Horst");
    assert.match(mail.body, /weekmarkt in het dorp/);
    assert.doesNotMatch(mail.subject, /gekeken/i);
    assert.doesNotMatch(mail.body, /kort bekeken|heb de website|jullie website/i);
    assertFirstMail(mail.body);
  }

  const neutral = fallbackAcquisitionMail({
    companyName: "Bakkerij De Horst",
    domain: "dehorst.example",
    fit: "REVIEW_REQUIRED",
    findings: [],
    websitePresence: "NO_WEBSITE",
  });
  assert.equal(neutral.approach.sufficient, false);
  assert.match(neutral.body, /geen website om na te kijken/);
  assert.match(neutral.body, /verzin ik niet/);
  assert.doesNotMatch(neutral.body, /kort bekeken|heb de website bekeken/i);
  assertFirstMail(neutral.body);
});

test("NO_WEBSITE concept blijft contact- en suppressiechecks houden", () => {
  const mail = fallbackAcquisitionMail({
    companyName: "Bakkerij De Horst",
    domain: "dehorst.example",
    fit: "REVIEW_REQUIRED",
    findings: [],
    websitePresence: "NO_WEBSITE",
  });
  const base = {
    website_url: "",
    status: "NEW",
    contact: { email: "info@dehorst.example", do_not_contact: false },
    do_not_contact: false,
    contact_status: "UNKNOWN",
    suppression: null,
    auto_outreach_blocked: false,
  };
  const draft = {
    subject: mail.subject,
    body_text: mail.body,
    scan_id: null,
    status: "draft",
    findings_used: [],
    prompt_version: MAIL_PROMPT_VERSION,
    kind: "acquisition_outreach",
  };
  const open = evaluatePreSend({
    prospect: base as never,
    mail: draft as never,
    live: true,
  });
  assert.equal(
    open.some((item) => item.code === "missing_scan"),
    false
  );
  assert.equal(open.length, 0);

  const suppressed = evaluatePreSend({
    prospect: {
      ...base,
      suppression: { id: "s", email: "info@dehorst.example", domain: null, reason: "UNSUBSCRIBED", source: "admin", created_at: "" },
    } as never,
    mail: draft as never,
    live: true,
  });
  assert.ok(suppressed.some((item) => item.code === "suppressed"));

  const blocked = evaluatePreSend({
    prospect: { ...base, do_not_contact: true } as never,
    mail: draft as never,
    live: true,
  });
  assert.ok(blocked.some((item) => item.code === "do_not_contact"));
});
