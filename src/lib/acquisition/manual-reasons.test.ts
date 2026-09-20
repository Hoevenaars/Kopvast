import assert from "node:assert/strict";
import test from "node:test";
import { FORBIDDEN_MAIL_CLAIMS } from "../acquisition-constants";
import { fallbackAcquisitionMail } from "../acquisition-mail";
import { evaluatePreSend } from "../acquisition-send";
import { isUnreachableSiteMail } from "./unreachable-site-mail";
import {
  findingsFromManualReasons,
  isManualReasonCategory,
  isManualReasonsMail,
  mailHasFindings,
  parseManualReasonCategories,
} from "./manual-reasons";

test("handmatige redenen eisen precies twee verschillende geldige keuzes", () => {
  assert.equal(isManualReasonCategory("visual"), true);
  assert.equal(isManualReasonCategory("seo"), false);
  assert.equal(parseManualReasonCategories(["visual"]).ok, false);
  assert.equal(parseManualReasonCategories(["visual", "visual"]).ok, false);
  assert.equal(parseManualReasonCategories(["visual", "onzin"]).ok, false);
  const parsed = parseManualReasonCategories(["mobile", "conversion"]);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.categories, ["mobile", "conversion"]);
  }
});

test("twee aangeklikte redenen worden een gewone acquisitiemail", () => {
  const parsed = parseManualReasonCategories(["visual", "conversion"]);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const findings = findingsFromManualReasons(parsed.categories);
  assert.equal(findings.length, 2);
  const mail = fallbackAcquisitionMail({
    companyName: "Atelier Lint",
    domain: "atelierlint.nl",
    fit: "REVIEW_REQUIRED",
    findings,
  });
  assert.match(mail.body, /kort bekeken/);
  assert.match(mail.body, /Twee dingen vielen direct op/);
  assert.match(mail.body, /eerste indruk kan sterker/);
  assert.match(mail.body, /route naar contact kan directer/);
  assert.equal(isUnreachableSiteMail(mail.body), false);
  assert.equal(mail.findingsUsed.length, 2);
  for (const pattern of FORBIDDEN_MAIL_CLAIMS) {
    assert.equal(pattern.test(mail.body), false, String(pattern));
  }
});

test("mislukte scan met handmatige redenen mag LIVE zonder scan-id", () => {
  const parsed = parseManualReasonCategories(["trust", "content"]);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const findings = findingsFromManualReasons(parsed.categories);
  const generated = fallbackAcquisitionMail({
    domain: "rngnederland.nl",
    fit: "REVIEW_REQUIRED",
    findings,
  });
  const issues = evaluatePreSend({
    prospect: {
      status: "SCAN_FAILED",
      contact: { email: "info@rngnederland.nl", do_not_contact: false },
      do_not_contact: false,
      contact_status: "UNKNOWN",
      suppression: null,
      auto_outreach_blocked: false,
      scan: { status: "failed", error_message: "getaddrinfo EBUSY rngnederland.nl" },
      findings,
    } as never,
    mail: {
      subject: generated.subject,
      body_text: generated.body,
      scan_id: null,
      status: "draft",
      findings_used: generated.findingsUsed,
      prompt_version: "kopvast-manual-reasons-v1",
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

test("herkent een mail met aangeklikte redenen", () => {
  assert.equal(mailHasFindings({ findings_used: [] }), false);
  assert.equal(mailHasFindings({ findings_used: [{ title: "Uitstraling" }] }), true);
  assert.equal(isManualReasonsMail({ prompt_version: "kopvast-manual-reasons-v1", findings_used: [] }), true);
  assert.equal(isManualReasonsMail({ prompt_version: "kopvast-acquisition-mail-v3", findings_used: [] }), false);
});
