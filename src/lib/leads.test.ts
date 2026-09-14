import assert from "node:assert/strict";
import test from "node:test";
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
  assert.equal(row.source, "kopvast");
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
