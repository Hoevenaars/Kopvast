import assert from "node:assert/strict";
import test from "node:test";
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
