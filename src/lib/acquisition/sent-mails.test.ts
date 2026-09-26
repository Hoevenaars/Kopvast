import assert from "node:assert/strict";
import test from "node:test";
import type { ProspectMail } from "@/lib/acquisition";
import { sentMailKindLabel, sentMailRecords } from "./sent-mails";

function mail(patch: Partial<ProspectMail> & Pick<ProspectMail, "id" | "status">): ProspectMail {
  return {
    prospect_id: "p",
    contact_id: null,
    scan_id: null,
    analysis_id: null,
    subject: "Onderwerp",
    body_text: "Beste,",
    kind: "acquisition_outreach",
    email_mode: "LIVE",
    intended_to_email: "klant@example.nl",
    to_email: "klant@example.nl",
    provider_message_id: null,
    template_version: null,
    prompt_version: null,
    findings_used: [],
    last_error: null,
    created_at: "2026-09-26T08:00:00.000Z",
    sent_at: null,
    delivered_at: null,
    failed_at: null,
    ...patch,
  };
}

test("verzonden mails blijven zichtbaar, concepten niet", () => {
  const records = sentMailRecords([
    mail({ id: "draft", status: "draft", created_at: "2026-09-26T09:00:00.000Z" }),
    mail({ id: "older", status: "sent", sent_at: "2026-09-26T08:10:00.000Z" }),
    mail({ id: "newer", status: "delivered", sent_at: "2026-09-26T08:40:00.000Z" }),
    mail({ id: "failed", status: "failed" }),
  ]);
  assert.deepEqual(
    records.map((item) => item.id),
    ["newer", "older"]
  );
});

test("soort verzending heeft een leesbaar label", () => {
  assert.equal(sentMailKindLabel("acquisition_outreach"), "Acquisitiemail");
  assert.equal(sentMailKindLabel("acquisition_test"), "Testmail");
  assert.equal(sentMailKindLabel("acquisition_follow_up"), "Automatische follow-up");
});
