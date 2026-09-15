import assert from "node:assert/strict";
import test from "node:test";
import { calculateOpportunityScore, canonicalDomainFromInput } from "./acquire-score";
import { statusFromScore, FORBIDDEN_MAIL_CLAIMS, pickCommercialFindings } from "./acquisition-constants";
import { detectComplexityFlags, determineProductFit } from "./acquire-fit";
import { composeAcquisitionBody, fallbackAcquisitionMail, pickMailFindings, selectableMailFindings } from "./acquisition-mail";
import { evaluatePreSend } from "./acquisition-send";
import { normalizeWebsiteUrl } from "./ssrf";
import { domainFromUrl } from "./acquire-map";

test("normaliseert www, slash, http en kaal domein naar hetzelfde bedrijf", () => {
  const variants = ["https://www.bedrijf.nl", "https://bedrijf.nl/", "http://bedrijf.nl", "bedrijf.nl"];
  const domains = variants.map((item) => canonicalDomainFromInput(item).domain);
  assert.ok(domains.every((item) => item === "bedrijf.nl"));
  assert.equal(domainFromUrl(normalizeWebsiteUrl("https://www.bedrijf.nl/pad").toString()), "bedrijf.nl");
});

test("scorethresholds komen uit één bron", () => {
  assert.equal(statusFromScore(49), "REJECTED");
  assert.equal(statusFromScore(50), "WATCHLIST");
  assert.equal(statusFromScore(65), "QUALIFIED");
  assert.equal(statusFromScore(80), "SALES_READY");
  assert.equal(statusFromScore(90), "PRIORITY");
});

test("opportunity score blijft binnen 100 en telt de vier blokken", () => {
  const score = calculateOpportunityScore({
    visual: 40,
    conversion: 30,
    content: 50,
    commercialFit: 20,
    productFit: "STANDARD_FIT",
    findings: [
      {
        category: "conversion",
        finding_type: "FACT",
        title: "Geen contact",
        description: "Geen formulier.",
        severity: "critical",
        confidence: 0.9,
        evidence_type: "html",
        evidence_reference: "no form",
        created_by: "system",
      },
    ],
  });
  assert.equal(
    score.total,
    score.websiteImprovement + score.commercialFit + score.productFit + score.evidenceQuality
  );
  assert.ok(score.total <= 100);
  assert.ok(score.websiteImprovement <= 35);
  assert.ok(score.commercialFit <= 30);
  assert.ok(score.productFit <= 25);
});

test("complexiteit is maatwerk, geen afwijzing", () => {
  const flags = detectComplexityFlags({
    title: "Webshop",
    htmlText: "Onze webshop en klantomgeving",
    findings: [],
  });
  const fit = determineProductFit({ flags });
  assert.equal(fit.fit, "CUSTOM_FIT");
  assert.notEqual(fit.fit, "NOT_FIT");
  assert.equal(determineProductFit({ flags: detectComplexityFlags({ findings: [] }) }).fit, "STANDARD_FIT");
});

test("acquisitiemail gebruikt findings en vermijdt verboden claims", () => {
  const findings = [
    {
      finding_type: "HYPOTHESIS",
      category: "conversion",
      title: "Omzet",
      description: "Jullie verliezen omzet via een slechte conversie.",
      severity: "critical",
    },
    {
      finding_type: "OBSERVATION",
      category: "mobile",
      title: "Mobiel",
      description: "De mobiele presentatie kan scherper.",
      severity: "important",
    },
    {
      finding_type: "FACT",
      category: "conversion",
      title: "Contact",
      description: "Er ligt ruimte om de route naar contact duidelijker te maken.",
      severity: "important",
    },
  ];
  assert.equal(selectableMailFindings(findings).length, 2);
  assert.equal(pickMailFindings(findings).length, 2);
  const mail = fallbackAcquisitionMail({
    companyName: "Nova Advies",
    domain: "nova-advies.nl",
    fit: "STANDARD_FIT",
    findings,
  });
  assert.match(mail.subject, /Nova Advies|nova-advies|punten/i);
  assert.match(mail.body, /Goedendag/);
  assert.match(mail.body, /€1.495|1.495/);
  for (const pattern of FORBIDDEN_MAIL_CLAIMS) {
    assert.equal(pattern.test(mail.body), false, String(pattern));
  }
  const composed = composeAcquisitionBody({
    domain: "nova-advies.nl",
    fit: "CUSTOM_FIT",
    findings,
    points: ["De belangrijkste diensten kunnen duidelijker naar voren komen."],
  });
  assert.match(composed, /buiten het vaste websitepakket|Op aanvraag|mee/);
  assert.doesNotMatch(composed, /verliezen omzet/);
});

test("commerciële findings zetten feiten en observaties vóór hypotheses", () => {
  const picked = pickCommercialFindings(
    [
      { finding_type: "HYPOTHESIS", severity: "critical", title: "h" },
      { finding_type: "OBSERVATION", severity: "nice_to_have", title: "o" },
      { finding_type: "FACT", severity: "important", title: "f" },
    ],
    2
  );
  assert.equal(picked[0]?.title, "f");
  assert.equal(picked[1]?.title, "o");
});

test("pre-send checks blokkeren suppression en ontbrekende mail", () => {
  const prospect = {
    id: "p1",
    company_name: "Nova",
    domain: "nova-advies.nl",
    website_url: "https://nova-advies.nl",
    status: "SALES_READY",
    opportunity_score: 84,
    website_improvement_potential: 20,
    commercial_fit_score: 18,
    product_fit_score: 22,
    product_fit: "STANDARD_FIT",
    contact_status: "UNKNOWN",
    mail_status: "draft",
    response_status: null,
    next_action: null,
    next_action_at: null,
    do_not_contact: false,
    auto_outreach_blocked: false,
    legal_note: null,
    notes: null,
    last_scan_at: null,
    last_contacted_at: null,
    last_activity_at: null,
    created_at: new Date().toISOString(),
    inbound_lead_id: null,
    public_check_token: "abc",
    scan_cost: 0,
    ai_cost: 0,
    email_cost: 0,
    total_cost: 0,
    contact: {
      id: "c1",
      prospect_id: "p1",
      email: "info@nova-advies.nl",
      email_source: "admin",
      email_verification_status: "UNKNOWN",
      contact_status: "UNKNOWN",
      consent_source: null,
      consent_timestamp: null,
      do_not_contact: false,
      legal_note: null,
    },
    contacts: [],
    scan: null,
    findings: [],
    mail: null,
    mails: [],
    activities: [],
    suppression: { id: "s1", email: "info@nova-advies.nl", domain: null, reason: "UNSUBSCRIBED", source: "admin", created_at: "" },
    scoreBreakdown: { websiteImprovement: null, commercialFit: null, productFit: null, evidenceQuality: null },
  } as const;

  const blocked = evaluatePreSend({ prospect: prospect as never, mail: null, live: true });
  assert.ok(blocked.some((item) => item.code === "suppressed"));
  assert.ok(blocked.some((item) => item.code === "missing_mail"));

  const open = evaluatePreSend({
    prospect: { ...prospect, suppression: null } as never,
    mail: {
      id: "m1",
      prospect_id: "p1",
      contact_id: "c1",
      scan_id: "scan1",
      analysis_id: "a1",
      subject: "Kort gekeken naar Nova",
      body_text: "Goedendag,",
      status: "draft",
      kind: "acquisition_outreach",
      email_mode: "TEST",
      intended_to_email: "info@nova-advies.nl",
      to_email: "info@nova-advies.nl",
      provider_message_id: null,
      template_version: "acquisition-outreach-v1",
      prompt_version: "kopvast-acquisition-mail-v1",
      findings_used: [{ title: "Mobiel" }],
      last_error: null,
      created_at: new Date().toISOString(),
      sent_at: null,
      delivered_at: null,
      failed_at: null,
    },
    live: true,
  });
  assert.equal(open.length, 0);
});
