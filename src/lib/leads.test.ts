import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { render } from "react-email";
import { LeadConfirmationEmail } from "../emails/lead-confirmation";
import { LeadNotificationEmail } from "../emails/lead-notification";
import { confirmationCopy, humanizeValue, notificationFields, notificationIntro } from "../emails/copy";
import { DOMAIN_LANDING_SOURCE } from "./domain-landing";
import { fromAddress } from "./email";
import { inboundType, mapInboundLead } from "./inbound";
import { formatLeadDetails } from "./leads";
import { webhookTypeToStatus } from "./email-log";

test("zet formulierdetails om naar leesbare tekst", () => {
  const text = formatLeadDetails({
    Merkstatus: "verouderd",
    Pagina: "Home, Contact",
    "": "",
  });
  assert.match(text, /Merkstatus: verouderd/);
  assert.match(text, /Pagina: Home, Contact/);
  assert.doesNotMatch(text, /^: /m);
});

test("vertaalt Resend-webhooks naar verzendstatus", () => {
  assert.equal(webhookTypeToStatus("email.delivered"), "delivered");
  assert.equal(webhookTypeToStatus("email.bounced"), "bounced");
  assert.equal(webhookTypeToStatus("email.failed"), "failed");
  assert.equal(webhookTypeToStatus("email.opened"), null);
});

test("zet acquisitie-start om naar een website-aanvraag", () => {
  const row = mapInboundLead({
    id: "lead-acq",
    name: "Eva",
    email: "eva@example.com",
    company: "Fluweel Events",
    website: "fluweelevents.nl",
    message: "Klaar om te starten",
    source: "acquisitie-voorstel",
    phone: "06",
    details: {
      Keuze: "Voorstel",
      Prijs: "€995 excl. btw",
      Startbevestiging: "Ik wil starten met Kopvast Website voor €995 excl. btw.",
    },
  });
  assert.equal(row.type, "website");
  assert.equal(row.status, "NIEUW");
  assert.equal(row.product_fit, "STANDARD_FIT");
  assert.equal(row.source, "acquisitie-voorstel");
  assert.equal(row.company_name, "Fluweel Events");
});

test("zet website-aanvraag om naar Website Refresh inbound lead", () => {
  const row = mapInboundLead({
    id: "lead-1",
    name: "Eva",
    email: "eva@example.com",
    company: "Ardea",
    website: "https://ardea.studio",
    message: "Zes pagina’s",
    source: "website-aanvraag",
    phone: "06",
    details: {
      Merkstatus: "verouderd",
      "Pagina's": "Home, Contact",
    },
  });
  assert.equal(inboundType("website-aanvraag"), "website");
  assert.equal(row.type, "website");
  assert.equal(row.status, "NIEUW");
  assert.equal(row.source, "website-aanvraag");
  assert.equal(row.product_fit, "STANDARD_FIT");
  assert.equal(row.has_brand, "verouderd");
  assert.equal(row.pages, "Home, Contact");
});

test("zet maatwerkvraag om naar Website Refresh inbound lead", () => {
  const row = mapInboundLead({
    id: "lead-2",
    name: "Eva",
    email: "eva@example.com",
    company: "Ardea",
    website: "",
    message: "Webshop",
    source: "maatwerk",
    phone: "",
    details: {
      Idee: "Webshop",
      Functionaliteit: "webshop",
      Omvang: "groot",
      Timing: "dit kwartaal",
    },
  });
  assert.equal(row.type, "maatwerk");
  assert.equal(row.status, "MAATWERK_REVIEW");
  assert.equal(row.product_fit, "CUSTOM_FIT");
  assert.equal(row.source, "maatwerk");
  assert.equal(row.request_detail, "Webshop");
  assert.equal(row.functionality, "webshop");
});

test("gebruikt contact@kopvast.nl als afzender zonder sandbox", () => {
  const previous = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_FROM_EMAIL;
  try {
    assert.equal(fromAddress(), "Kopvast <contact@kopvast.nl>");
  } finally {
    if (previous === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previous;
  }
});

test("toont formulierkeuzes in leesbare labels", () => {
  assert.equal(humanizeValue("verouderd"), "De uitstraling is verouderd of versnipperd");
  assert.equal(humanizeValue("webshop, campagne"), "Webshop, Campagne of landingspagina");
  const fields = notificationFields({
    name: "Eva",
    email: "eva@example.com",
    source: "website-aanvraag",
    message: "Zes pagina’s",
    details: {
      Merkstatus: "verouderd",
      "Pagina's": "Home, Contact",
    },
  });
  assert.equal(fields.find((field) => field.label === "Bron")?.value, "Kopvast Website");
  assert.equal(
    notificationFields({ name: "Eva", email: "eva@example.com", source: "acquisitie-voorstel" }).find(
      (field) => field.label === "Bron"
    )?.value,
    "Acquisitie · voorstel"
  );
  assert.equal(
    fields.find((field) => field.label === "Merkstatus")?.value,
    "De uitstraling is verouderd of versnipperd"
  );
  assert.equal(fields.find((field) => field.label === "Toelichting")?.value, "Zes pagina’s");
});

test("interne aanvraagmail gebruikt de Kopvast-huisstijl", async () => {
  const html = await render(
    createElement(LeadNotificationEmail, {
      name: "Eva Linden",
      email: "eva@ardea.studio",
      company: "Ardea",
      source: "website-aanvraag",
      details: { Merkstatus: "verouderd" },
    })
  );
  assert.match(html, /KOPVAST/);
  assert.match(html, /#f3f0e8|#c7663a|rgb\(243,\s*240,\s*232\)/i);
  assert.match(html, /#c7663a|rgb\(199,\s*102,\s*58\)/i);
  assert.match(html, /Newsreader|Georgia/);
  assert.match(html, /De uitstraling is verouderd of versnipperd/);
  assert.doesNotMatch(html, /<pre/i);
});

test("zet domeininteresse om naar inbound lead zonder website-fit", () => {
  const row = mapInboundLead({
    id: "lead-domain",
    name: "Eva",
    email: "eva@example.com",
    company: "",
    website: "voorbeeld.nl",
    message: "Graag de prijs weten",
    source: DOMAIN_LANDING_SOURCE,
    phone: "",
    details: {
      Domein: "voorbeeld.nl",
      Type: "Bod",
      Bod: "€ 2.500",
      "Website interesse": "Nee",
    },
  });
  assert.equal(row.source, DOMAIN_LANDING_SOURCE);
  assert.equal(row.product_fit, "REVIEW_REQUIRED");
  assert.equal(row.status, "NIEUW");
  assert.equal(row.company_name, "voorbeeld.nl");
  assert.equal(row.payload.domain, "voorbeeld.nl");
  assert.equal(row.payload.intent, "bid");
  assert.equal(row.payload.bid_amount, 2500);
  assert.equal(row.payload.wants_website, false);
});

test("interne domeinmail toont DOMEININTERESSE en bod", () => {
  const lead = {
    name: "Eva",
    email: "eva@example.com",
    source: DOMAIN_LANDING_SOURCE,
    website: "voorbeeld.nl",
    message: "Ik ben geïnteresseerd",
    details: {
      Domein: "voorbeeld.nl",
      Type: "Bod",
      Bod: "€ 2.500",
      "Website interesse": "Ja",
    },
  };
  const fields = notificationFields(lead);
  assert.equal(fields.find((field) => field.label === "Domein")?.value, "voorbeeld.nl");
  assert.equal(fields.find((field) => field.label === "Type")?.value, "Bod");
  assert.equal(fields.find((field) => field.label === "Bod")?.value, "€ 2.500");
  assert.equal(fields.find((field) => field.label === "Website interesse")?.value, "Ja");
  assert.match(notificationIntro(lead), /DOMEININTERESSE/);
  assert.equal(confirmationCopy(DOMAIN_LANDING_SOURCE).eyebrow, "Domein");
  const reconstructed = notificationFields({
    ...lead,
    message: formatLeadDetails(lead.details),
  });
  assert.equal(reconstructed.find((field) => field.label === "Bericht"), undefined);
});

test("klantbevestiging volgt dezelfde huisstijl", async () => {
  const html = await render(createElement(LeadConfirmationEmail, { name: "Eva Linden", source: "maatwerk" }));
  const copy = confirmationCopy("maatwerk");
  assert.match(html, /KOPVAST/);
  assert.match(html, /Hallo Eva Linden/);
  assert.match(html, new RegExp(copy.title.replaceAll(".", "\\.")));
  assert.match(html, /#a64d27|rgb\(166,\s*77,\s*39\)/i);
  assert.doesNotMatch(html, /<pre/i);
});
