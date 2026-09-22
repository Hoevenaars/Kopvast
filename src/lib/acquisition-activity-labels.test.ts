import assert from "node:assert/strict";
import test from "node:test";
import { formatNlDateTime, labelForActivity, labelForActor } from "./acquisition-constants";

test("activiteitstijden staan op Nederlandse tijd", () => {
  const summer = formatNlDateTime("2026-09-22T15:11:21.000Z");
  assert.match(summer, /22/);
  assert.match(summer, /9/);
  assert.match(summer, /2026/);
  assert.match(summer, /17:11:21/);

  const winter = formatNlDateTime("2026-01-15T15:11:21.000Z");
  assert.match(winter, /16:11:21/);
});

test("activiteiten krijgen een Nederlandse naam", () => {
  assert.equal(labelForActivity("MAIL_SENT"), "Mail verzonden");
  assert.equal(labelForActivity("MAIL_QUEUED"), "Mail in wachtrij");
  assert.equal(labelForActivity("MAIL_EDITED"), "Mail bewerkt");
  assert.equal(labelForActivity("SCAN_COMPLETED"), "Scan afgerond");
  assert.equal(labelForActivity("PROSPECT_CREATED"), "Prospect aangemaakt");
  assert.equal(labelForActivity("SCAN_STARTED"), "Scan gestart");
  assert.equal(labelForActivity("MAIL_CLICKED", { choice: "info" }), "Geklikt op meer info");
  assert.equal(labelForActivity("MAIL_CLICKED", { choice: "proposal" }), "Geklikt op voorstel");
  assert.equal(labelForActivity("ONBEKEND_EVENT"), "ONBEKEND_EVENT");
});

test("actor bij een activiteit is Nederlands", () => {
  assert.equal(labelForActor("human"), "medewerker");
  assert.equal(labelForActor("system"), "systeem");
  assert.equal(labelForActor("user"), "bezoeker");
});
