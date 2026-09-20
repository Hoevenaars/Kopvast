import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { render } from "react-email";
import { calculateOpportunityScore, canonicalDomainFromInput } from "./acquire-score";
import {
  acquisitionPhase,
  adminStatusFromScore,
  nextStatusAfterLiveMail,
  preservesOutreachStatus,
  statusFromScore,
  FORBIDDEN_MAIL_CLAIMS,
  pickCommercialFindings,
} from "./acquisition-constants";
import { detectComplexityFlags, determineProductFit } from "./acquire-fit";
import { composeAcquisitionBody, fallbackAcquisitionMail, pickMailFindings, selectableMailFindings, buildOutreachMailData } from "./acquisition-mail";
import { buildSpecialOffer } from "./acquisition/special-offer-rules";
import {
  AcquisitionOutreachEmail,
  assertUniqueAcquisitionCopy,
  buildAcquisitionPlainText,
  buildOfferParagraph,
  DUPLICATE_EMAIL_CONTENT_ERROR,
  extractOfferParagraph,
  findDuplicatedAcquisitionContent,
  MORE_INFO_CTA_LABEL,
  parseOutreachBody,
  PROPOSAL_CTA_LABEL,
  validateOfferParagraph,
  visibleEmailTextFromHtml,
} from "../emails/acquisition-outreach";
import { evaluatePreSend } from "./acquisition-send";
import { prepareAcquisitionEmail } from "./acquisition-render";
import { buildUnreachableSiteMail } from "./acquisition/unreachable-site-mail";
import { sanitizeAcquisitionSearch, splitMailParagraphs } from "./mail-body";
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

test("handmatige acquisitie zet een lage score niet om in afwijzen", () => {
  assert.equal(adminStatusFromScore("REJECTED"), "WATCHLIST");
  assert.equal(adminStatusFromScore("WATCHLIST"), "WATCHLIST");
  assert.equal(adminStatusFromScore("SALES_READY"), "SALES_READY");
});

test("verzonden mail zet de fase op benaderd", () => {
  assert.equal(nextStatusAfterLiveMail("WATCHLIST"), "CONTACTED");
  assert.equal(nextStatusAfterLiveMail("ANALYSING"), "CONTACTED");
  assert.equal(nextStatusAfterLiveMail("CONVERTED"), null);
  assert.equal(preservesOutreachStatus("CONTACTED"), true);
  assert.equal(acquisitionPhase({ status: "WATCHLIST", mail_status: "sent" }), "Benaderd");
  assert.equal(acquisitionPhase({ status: "CONTACTED", mail_status: "sent" }), "Benaderd");
  assert.equal(acquisitionPhase({ status: "WATCHLIST", mail_status: "draft" }), "Watchlist");
  assert.equal(acquisitionPhase({ status: "CONTACTED", response_status: "POSITIVE" }), "Benaderd");
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
      title: "Op mobiel verdwijnt de belangrijkste boodschap.",
      description: "De mobiele presentatie kan scherper.",
      severity: "important",
    },
    {
      finding_type: "FACT",
      category: "conversion",
      title: "De route naar contact kan directer.",
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
  assert.equal(mail.subject, "Even gekeken naar nova-advies.nl");
  assert.match(mail.body, /Goedendag/);
  assert.match(mail.body, /Ik kwam nova-advies.nl tegen en heb de website kort bekeken/);
  assert.match(mail.body, /€1.495|1.495/);
  assert.doesNotMatch(mail.body, /vanaf\s*€?\s*995/i);
  assert.doesNotMatch(mail.body, /Voor jullie maak ik daar €995/);
  assert.match(mail.body, /Wat heeft jullie voorkeur/);
  assert.match(mail.body, /Ja, doe me een voorstel/);
  assert.match(mail.body, /Stuur me eerst meer info/);
  assert.doesNotMatch(mail.body, /A — Laat zien hoe jullie dit zouden aanpakken/);
  assert.doesNotMatch(mail.body, /Wat wil je eerst zien/);
  assert.match(mail.body, /meer karakter dan er nu online uitkomt/);
  assert.doesNotMatch(mail.body, /meer in zich/);
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
  assert.doesNotMatch(composed, /€995/);
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

test("mailselectie zet commerciële findings vóór accessibility", () => {
  const picked = pickMailFindings([
    {
      finding_type: "FACT",
      category: "accessibility",
      title: "Beeld is slecht toegankelijk.",
      description: "Afbeeldingen missen alt-teksten.",
      severity: "critical",
    },
    {
      finding_type: "OBSERVATION",
      category: "visual",
      title: "De eerste indruk kan sterker.",
      description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
      severity: "important",
    },
    {
      finding_type: "FACT",
      category: "conversion",
      title: "De route naar contact kan directer.",
      description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
      severity: "important",
    },
  ]);
  assert.equal(picked.length, 2);
  assert.equal(picked[0]?.category, "visual");
  assert.equal(picked[1]?.category, "conversion");
  assert.equal(
    picked.some((item) => item.category === "accessibility"),
    false
  );
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
      template_version: "acquisition-outreach-v2",
      prompt_version: "kopvast-acquisition-mail-v2",
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

  const mailWithoutFindings = {
    id: "m2",
    prospect_id: "p1",
    contact_id: "c1",
    scan_id: "scan1",
    analysis_id: "a1",
    subject: "Even gekeken naar nova-advies.nl",
    body_text: "Goedendag,",
    status: "draft",
    kind: "acquisition_outreach",
    email_mode: "LIVE",
    intended_to_email: "info@nova-advies.nl",
    to_email: "info@nova-advies.nl",
    provider_message_id: null,
    template_version: "acquisition-outreach-v3",
    prompt_version: "kopvast-acquisition-mail-v3",
    findings_used: [],
    last_error: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    delivered_at: null,
    failed_at: null,
  };
  const humanWithoutFindings = evaluatePreSend({
    prospect: { ...prospect, suppression: null } as never,
    mail: mailWithoutFindings as never,
    live: true,
  });
  assert.equal(
    humanWithoutFindings.some((item) => item.code === "missing_findings"),
    false
  );
  const autoWithoutFindings = evaluatePreSend({
    prospect: { ...prospect, suppression: null } as never,
    mail: mailWithoutFindings as never,
    live: true,
    auto: true,
  });
  assert.ok(autoWithoutFindings.some((item) => item.code === "missing_findings"));
});

const persingenFindings = [
  {
    finding_type: "OBSERVATION",
    category: "visual",
    title: "De locatie mag meer het werk doen.",
    description: "Het bijzondere karakter en de sfeer krijgen online nog weinig ruimte om echt te overtuigen.",
    severity: "important",
  },
  {
    finding_type: "FACT",
    category: "conversion",
    title: "De route naar een aanvraag kan directer.",
    description: "Een bezoeker moet nu behoorlijk zoeken voordat duidelijk wordt wat de logische volgende stap is.",
    severity: "important",
  },
];

test("speciale €995-reden volgt geografische prioriteit en bewijs", () => {
  const groesbeek = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: "Groesbeek",
    municipality: "Berg en Dal",
    contentEvidence: [
      {
        reason: "HERITAGE_SPECIAL_PLACE",
        evidence: "Het kerkje staat in een monumentale setting.",
        confidence: 0.9,
      },
    ],
  });
  assert.equal(groesbeek.eligible, true);
  assert.equal(groesbeek.geographicReason, "GROESBEEK");
  assert.equal(groesbeek.contentReason, "HERITAGE_SPECIAL_PLACE");
  assert.equal(groesbeek.reasonLines.length, 2);
  assert.match(groesbeek.offerParagraph, /€1.495/);
  assert.match(groesbeek.offerParagraph, /€995/);
  assert.match(groesbeek.offerParagraph, /Groesbekers/);
  assert.doesNotMatch(groesbeek.offerParagraph, /eigen gemeente/);

  const persingen = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: "Persingen",
    municipality: "Berg en Dal",
    contentEvidence: [
      {
        reason: "HERITAGE_SPECIAL_PLACE",
        evidence: "Kerkje van Persingen is een karakteristieke locatie.",
        confidence: 0.94,
      },
    ],
  });
  assert.equal(persingen.geographicReason, "BERG_EN_DAL");
  assert.match(persingen.offerParagraph, /eigen gemeente/);
  assert.match(persingen.offerParagraph, /offline zoiets bijzonders/);

  const nijmegen = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: "Nijmegen",
  });
  assert.equal(nijmegen.geographicReason, "REGION_NIJMEGEN");
  assert.equal(nijmegen.contentReason, null);
  assert.equal(nijmegen.reasonLines.length, 1);
  assert.match(nijmegen.offerParagraph, /klanten in de regio/);

  const weakEvidence = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: "Amsterdam",
    contentEvidence: [
      {
        reason: "HERITAGE_SPECIAL_PLACE",
        evidence: "Misschien historisch.",
        confidence: 0.4,
      },
    ],
  });
  assert.equal(weakEvidence.eligible, false);

  const launch = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    place: "Amsterdam",
    allowLaunchOffer: true,
  });
  assert.equal(launch.eligible, true);
  assert.match(launch.offerParagraph, /scherpe uitzondering/);

  const custom = buildSpecialOffer({
    productFit: "CUSTOM_FIT",
    place: "Groesbeek",
  });
  assert.equal(custom.eligible, false);
  assert.equal(custom.offerParagraph, "");
});

test("€995-maildata vereist STANDARD_FIT en een geldige reden", () => {
  const data = buildOutreachMailData({
    companyName: "Kerkje van Persingen",
    domain: "kerkjepersingen.nl",
    place: "Persingen",
    municipality: "Berg en Dal",
    productFit: "STANDARD_FIT",
    openingObservation:
      "Kerkje van Persingen heeft als locatie veel karakter. Online komt dat nu minder sterk over dan volgens mij mogelijk is.",
    finding1: {
      title: "De locatie mag meer het werk doen.",
      description: "Het bijzondere karakter en de sfeer krijgen online nog weinig ruimte om echt te overtuigen.",
    },
    finding2: {
      title: "De route naar een aanvraag kan directer.",
      description: "Een bezoeker moet nu behoorlijk zoeken voordat duidelijk wordt wat de logische volgende stap is.",
    },
    contentEvidence: [
      {
        reason: "HERITAGE_SPECIAL_PLACE",
        evidence: "Kerkje van Persingen is een karakteristieke locatie.",
        confidence: 0.94,
      },
    ],
    choiceAUrl: "https://kopvast.nl/werkwijze",
    choiceBUrl: "https://kopvast.nl/websites",
  });
  assert.equal(data.subject, "Even gekeken naar kerkjepersingen.nl");
  assert.match(data.plainText, /€1.495/);
  assert.match(data.plainText, /€995/);
  assert.match(data.plainText, /eigen gemeente/);
  assert.doesNotMatch(data.plainText, /vanaf €995/);
  assert.equal(data.offerMetadata.geographicReason, "BERG_EN_DAL");
  assert.equal(data.offerMetadata.contentReason, "HERITAGE_SPECIAL_PLACE");

  assert.throws(
    () =>
      buildOutreachMailData({
        domain: "nova-advies.nl",
        productFit: "CUSTOM_FIT",
        openingObservation: "Nova Advies is helder in wat ze doen.",
        finding1: { title: "De eerste indruk kan sterker.", description: "De uitstraling blijft achter." },
        finding2: { title: "De route naar contact kan directer.", description: "Contact is te ver weggestopt." },
        choiceAUrl: "https://kopvast.nl/werkwijze",
        choiceBUrl: "https://kopvast.nl/websites",
      }),
    /STANDARD_FIT/
  );

  assert.throws(
    () =>
      buildOutreachMailData({
        domain: "nova-advies.nl",
        productFit: "STANDARD_FIT",
        openingObservation: "Nova Advies is helder in wat ze doen.",
        finding1: { title: "De eerste indruk kan sterker.", description: "De uitstraling blijft achter." },
        finding2: { title: "De route naar contact kan directer.", description: "Contact is te ver weggestopt." },
        choiceAUrl: "https://kopvast.nl/werkwijze",
        choiceBUrl: "https://kopvast.nl/websites",
      }),
    /Manual review/
  );
});

test("acquisitiemail voor Persingen is persoonlijk en minimaal", async () => {
  const mail = fallbackAcquisitionMail({
    companyName: "Kerkje van Persingen",
    domain: "kerkjepersingen.nl",
    fit: "STANDARD_FIT",
    findings: persingenFindings,
    place: "Persingen",
    municipality: "Berg en Dal",
    contentEvidence: [
      {
        reason: "HERITAGE_SPECIAL_PLACE",
        evidence: "Kerkje van Persingen is een karakteristieke locatie.",
        confidence: 0.94,
      },
    ],
  });
  assert.equal(mail.subject, "Even gekeken naar kerkjepersingen.nl");
  assert.match(mail.body, /Kerkje van Persingen/);
  assert.match(mail.body, /Twee dingen vielen direct op/);
  assert.match(mail.body, /€995/);
  assert.doesNotMatch(mail.body, /scan|algoritme|opportunity score|digitale aanwezigheid/i);

  const parsed = parseOutreachBody(mail.body, "kerkjepersingen.nl");
  assert.match(parsed.openingObservation ?? "", /karakter|Kerkje/i);
  assert.equal(parsed.finding1?.title, persingenFindings[0].title);
  assert.equal(parsed.finding2?.title, persingenFindings[1].title);
  assert.equal(buildAcquisitionPlainText(parsed as never).includes("kerkjepersingen.nl"), true);

  const html = await render(
    createElement(AcquisitionOutreachEmail, {
      ...mail.emailProps,
      body: mail.body,
    })
  );
  assert.match(html, /KOPVAST/);
  assert.match(html, /Even gekeken naar kerkjepersingen.nl/);
  assert.match(html, /Ja, doe me een voorstel/);
  assert.match(html, /Stuur me eerst meer info/);
  assert.doesNotMatch(html, /A — Laat zien hoe jullie dit zouden aanpakken/);
  assert.doesNotMatch(html, /Wat wil je eerst zien/);
  assert.match(html, /werkwijze/);
  assert.match(html, /websites/);
  assert.match(html, /#ffffff|rgb\(255,\s*255,\s*255\)/i);
  assert.doesNotMatch(html, /Bekijk het websitepakket/);
  assert.doesNotMatch(html, /bg-ivory|#f3f0e8/i);
  assert.doesNotMatch(html, /Newsreader/);
  const visible = visibleEmailTextFromHtml(html);
  assert.equal(findDuplicatedAcquisitionContent(visible), null);
  assert.equal((visible.match(/KOPVAST/g) ?? []).length, 1);
});

test("offerparagraaf bevat alleen prijs en reden", () => {
  const offer = buildOfferParagraph("Als Groesbekers onder elkaar doe je dat voor elkaar.");
  assert.match(offer, /€1.495/);
  assert.match(offer, /€995/);
  assert.match(offer, /Groesbekers/);
  validateOfferParagraph(offer);
  assert.throws(
    () =>
      validateOfferParagraph(
        "KOPVAST Goedendag, Ik kwam fluweelevents.nl tegen en heb de website kort bekeken. Een complete Kopvast Website kost normaal €1.495 excl. btw."
      ),
    /full email content/
  );
});

test("HTML rendert de mailbody niet een tweede keer via de offerparagraaf", async () => {
  const trackingA = "https://kopvast.nl/r/proposal-fluweel";
  const trackingB = "https://kopvast.nl/r/info-fluweel";
  const mail = fallbackAcquisitionMail({
    companyName: "Fluweel Events",
    domain: "fluweelevents.nl",
    fit: "STANDARD_FIT",
    findings: [
      {
        finding_type: "FACT",
        category: "visual",
        title: "De eerste indruk kan sterker.",
        description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
        severity: "important",
      },
      {
        finding_type: "FACT",
        category: "conversion",
        title: "De route naar contact kan directer.",
        description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
        severity: "important",
      },
      {
        finding_type: "FACT",
        category: "accessibility",
        title: "Beeld is slecht toegankelijk.",
        description: "Afbeeldingen missen alt-teksten.",
        severity: "critical",
      },
    ],
    place: "Groesbeek",
    municipality: "Berg en Dal",
  });
  mail.emailProps.choiceAUrl = trackingA;
  mail.emailProps.choiceBUrl = trackingB;
  const body = buildAcquisitionPlainText(mail.emailProps);
  const parsedOffer = extractOfferParagraph(body);
  assert.equal(parsedOffer?.includes("KOPVAST"), false);
  assert.equal(parsedOffer?.includes("Goedendag"), false);
  assert.match(parsedOffer ?? "", /€995/);

  const html = await render(
    createElement(AcquisitionOutreachEmail, {
      domain: "fluweelevents.nl",
      companyName: "Fluweel Events",
      body,
    })
  );
  const visible = visibleEmailTextFromHtml(html);
  assert.equal(findDuplicatedAcquisitionContent(visible), null);
  assert.equal((visible.match(/KOPVAST/g) ?? []).length, 1);
  assert.equal((visible.match(/Goedendag/g) ?? []).length, 1);
  assert.equal((visible.match(/Twee dingen vielen direct op/g) ?? []).length, 1);
  assert.match(visible, /meer karakter dan er nu online uitkomt/);
  assert.doesNotMatch(html, /A — Laat zien/);
  assert.match(html, new RegExp(PROPOSAL_CTA_LABEL));
  assert.match(html, new RegExp(MORE_INFO_CTA_LABEL));
  assert.equal(html.includes(trackingA), true);
  assert.equal(html.includes(trackingB), true);
  assert.doesNotMatch(html, /\/werkwijze/);
  assert.equal(body.includes(`${PROPOSAL_CTA_LABEL}:\n${trackingA}`), true);
  assert.equal(body.includes(`${MORE_INFO_CTA_LABEL}:\n${trackingB}`), true);
  assert.match(body, /voorstel" of "meer info"/);
});

test("dubbele mailtekst blokkeert verzending", () => {
  const duplicated =
    "KOPVAST\n\nGoedendag,\n\nIk kwam fluweelevents.nl tegen en heb de website kort bekeken.\n\nKOPVAST\n\nGoedendag,\n\nIk kwam fluweelevents.nl tegen en heb de website kort bekeken.";
  assert.equal(findDuplicatedAcquisitionContent(duplicated), DUPLICATE_EMAIL_CONTENT_ERROR);
  assert.throws(() => assertUniqueAcquisitionCopy(duplicated), /duplicated content/);
});

test("mailparagrafen splitsen op lege regels", () => {
  assert.deepEqual(splitMailParagraphs("Goedendag,\n\nTweede alinea.\n\n\nDerde."), [
    "Goedendag,",
    "Tweede alinea.",
    "Derde.",
  ]);
  assert.deepEqual(splitMailParagraphs("   "), []);
});

test("onbereikbare-site-mail rendert zonder te doen alsof we de site zagen", async () => {
  const mail = buildUnreachableSiteMail({ domain: "atelierlint.nl", companyName: "Atelier Lint" });
  const prepared = await prepareAcquisitionEmail({
    domain: "atelierlint.nl",
    companyName: "Atelier Lint",
    subject: mail.subject,
    body: mail.body,
  });
  assert.match(prepared.html, /niet bereikbaar/);
  assert.match(prepared.html, /op te zetten/);
  assert.doesNotMatch(prepared.html, /kort bekeken/);
  assert.doesNotMatch(prepared.html, /Twee dingen vielen direct op/);
});

test("zoekterm gooit PostgREST-tekens eruit", () => {
  assert.equal(sanitizeAcquisitionSearch("  nova,advies%_nl  "), "nova advies nl");
  assert.equal(sanitizeAcquisitionSearch(""), "");
});
