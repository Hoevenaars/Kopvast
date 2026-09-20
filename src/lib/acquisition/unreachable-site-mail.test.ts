import assert from "node:assert/strict";
import test from "node:test";
import { FORBIDDEN_MAIL_CLAIMS } from "../acquisition-constants";
import { evaluatePreSend } from "../acquisition-send";
import {
  buildUnreachableSiteMail,
  isUnreachableProspect,
  isUnreachableSiteMail,
  unreachableSiteIntro,
} from "./unreachable-site-mail";

test("onbereikbare-site-mail beweert niet dat we de website hebben bekeken", () => {
  const mail = buildUnreachableSiteMail({ domain: "atelierlint.nl", companyName: "Atelier Lint" });
  assert.equal(mail.subject, "De website van atelierlint.nl is nu niet bereikbaar");
  assert.match(mail.body, /niet bereikbaar/);
  assert.match(mail.body, /op te zetten/);
  assert.match(mail.body, /€1.495|1.495/);
  assert.doesNotMatch(mail.body, /kort bekeken/);
  assert.doesNotMatch(mail.body, /Twee dingen vielen direct op/);
  assert.equal(isUnreachableSiteMail(mail.body), true);
  assert.equal(unreachableSiteIntro("atelierlint.nl").includes("atelierlint.nl"), true);
  for (const pattern of FORBIDDEN_MAIL_CLAIMS) {
    assert.equal(pattern.test(mail.body), false, String(pattern));
  }
});

test("herkent een mislukte scan als onbereikbare prospect", () => {
  assert.equal(isUnreachableProspect({ status: "SCAN_FAILED" }), true);
  assert.equal(isUnreachableProspect({ scanStatus: "failed" }), true);
  assert.equal(isUnreachableProspect({ scanError: "Timeout" }), true);
  assert.equal(isUnreachableProspect({ status: "SALES_READY", scanStatus: "completed" }), false);
});

test("handmatig versturen van een onbereikbare-site-mail eist geen scan-id", () => {
  const mail = buildUnreachableSiteMail({ domain: "atelierlint.nl" });
  const issues = evaluatePreSend({
    prospect: {
      contact: { email: "info@atelierlint.nl", do_not_contact: false },
      do_not_contact: false,
      contact_status: "UNKNOWN",
      suppression: null,
      auto_outreach_blocked: false,
    } as never,
    mail: {
      subject: mail.subject,
      body_text: mail.body,
      scan_id: null,
      status: "draft",
      findings_used: [],
    } as never,
    live: true,
  });
  assert.equal(
    issues.some((item) => item.code === "missing_scan"),
    false
  );
  assert.equal(
    issues.some((item) => item.code === "missing_findings"),
    false
  );
});
