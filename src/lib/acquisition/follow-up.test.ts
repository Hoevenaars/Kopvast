import assert from "node:assert/strict";
import test from "node:test";
import { prepareFollowUpEmail } from "@/lib/acquisition-render";
import {
  addBusinessDays,
  autoFollowUpIdempotencyKey,
  buildAutoFollowUpBody,
  buildManualFollowUpBody,
  canScheduleAutoFollowUp,
  followUpBlockReason,
  followUpDueAtFromSentAt,
  followUpOfferSentence,
  nurtureUntilFromChoice,
  showNoResponseChoices,
  summarizeScanChanges,
  type FollowUpSnapshot,
} from "./follow-up";

function snapshot(overrides: Partial<FollowUpSnapshot> = {}): FollowUpSnapshot {
  return {
    responseStatus: "NO_RESPONSE",
    commercialIntent: null,
    commercialStage: "PROSPECT",
    status: "SALES_READY",
    isArchived: false,
    doNotContact: false,
    contactDoNotContact: false,
    contactStatus: "UNKNOWN",
    autoOutreachBlocked: false,
    outreachPaused: false,
    mailStatus: "sent",
    contactVerification: "UNKNOWN",
    suppressionReason: null,
    hasRequest: false,
    hasProposal: false,
    hasCustomer: false,
    nurtureStatus: null,
    alreadySent: false,
    ...overrides,
  };
}

test("vier werkdagen slaan het weekend over", () => {
  const friday = new Date("2026-09-18T15:00:00.000Z");
  const due = addBusinessDays(friday, 4);
  assert.equal(due.toISOString(), "2026-09-24T15:00:00.000Z");

  const monday = new Date("2026-09-21T09:30:00.000Z");
  assert.equal(addBusinessDays(monday, 4).toISOString(), "2026-09-25T09:30:00.000Z");
});

test("een gemiste follow-up houdt de datum van de verzonden mail", () => {
  assert.equal(followUpDueAtFromSentAt(new Date("2026-09-21T15:21:44.242Z")), "2026-09-25T15:21:44.242Z");
  assert.equal(followUpDueAtFromSentAt(new Date("2026-09-26T08:45:48.243Z")), "2026-10-01T08:45:48.243Z");
});

test("automatische follow-up wordt maar één keer gepland", () => {
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_outreach" }), true);
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_test" }), false);
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_manual_follow_up" }), false);
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_outreach", dueAt: "2026-09-24T00:00:00.000Z" }), false);
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_outreach", sentAt: "2026-09-24T00:00:00.000Z" }), false);
  assert.equal(canScheduleAutoFollowUp({ kind: "acquisition_outreach", cancelledAt: "2026-09-24T00:00:00.000Z" }), false);
  assert.equal(autoFollowUpIdempotencyKey("prospect-1"), autoFollowUpIdempotencyKey("prospect-1"));
});

test("follow-up gebruikt het bestaande aanbod en blijft kort", () => {
  const discounted = buildAutoFollowUpBody({ domain: "fluweel.nl", fit: "STANDARD_FIT", place: "Groesbeek" });
  assert.match(discounted, /€995 excl\. btw/);
  assert.doesNotMatch(discounted, /Twee dingen vielen direct op/);
  assert.match(discounted, /Ja, doe me een voorstel/);
  assert.match(discounted, /Stuur me eerst meer info/);

  const standard = followUpOfferSentence({ fit: "STANDARD_FIT", place: "Amsterdam" });
  assert.match(standard ?? "", /€1\.495/);
  assert.doesNotMatch(standard ?? "", /€995/);

  const custom = followUpOfferSentence({ fit: "CUSTOM_FIT", place: "Groesbeek" });
  assert.match(custom ?? "", /maatwerk/i);
  assert.equal(custom?.includes("€995"), false);
});

test("follow-up blijft tegen wanneer opvolging niet meer mag", () => {
  assert.equal(followUpBlockReason(snapshot()), null);
  assert.equal(followUpBlockReason(snapshot({ responseStatus: "POSITIVE" })), "responded");
  assert.equal(followUpBlockReason(snapshot({ responseStatus: "QUESTION" })), "responded");
  assert.equal(followUpBlockReason(snapshot({ commercialIntent: "PROPOSAL" })), "intent");
  assert.equal(followUpBlockReason(snapshot({ commercialIntent: "MORE_INFO" })), "intent");
  assert.equal(followUpBlockReason(snapshot({ hasRequest: true })), "request");
  assert.equal(followUpBlockReason(snapshot({ hasProposal: true })), "proposal");
  assert.equal(followUpBlockReason(snapshot({ hasCustomer: true })), "customer");
  assert.equal(followUpBlockReason(snapshot({ suppressionReason: "UNSUBSCRIBED" })), "suppressed:UNSUBSCRIBED");
  assert.equal(followUpBlockReason(snapshot({ suppressionReason: "COMPLAINT" })), "suppressed:COMPLAINT");
  assert.equal(followUpBlockReason(snapshot({ suppressionReason: "LEGAL_BLOCK" })), "suppressed:LEGAL_BLOCK");
  assert.equal(followUpBlockReason(snapshot({ doNotContact: true })), "do_not_contact");
  assert.equal(followUpBlockReason(snapshot({ mailStatus: "bounced" })), "bounced");
  assert.equal(followUpBlockReason(snapshot({ status: "CLOSED" })), "closed");
  assert.equal(followUpBlockReason(snapshot({ outreachPaused: true })), "paused");
  assert.equal(followUpBlockReason(snapshot({ alreadySent: true })), "already_sent");
});

test("na de follow-up zijn de admin-keuzes er, nurture verstuurt niets vanzelf", () => {
  assert.equal(
    showNoResponseChoices({
      autoFollowUpSentAt: "2026-09-24T00:00:00.000Z",
      responseStatus: "NO_RESPONSE",
      commercialIntent: null,
      commercialStage: "PROSPECT",
      doNotContact: false,
      status: "SALES_READY",
      nurtureStatus: null,
      blocked: false,
    }),
    true
  );
  assert.equal(
    showNoResponseChoices({
      autoFollowUpSentAt: null,
      responseStatus: "NO_RESPONSE",
      commercialIntent: null,
      commercialStage: null,
      doNotContact: false,
      status: "SALES_READY",
      nurtureStatus: null,
      blocked: false,
    }),
    false
  );
  const until = nurtureUntilFromChoice("2w", null, new Date("2026-09-22T10:00:00.000Z"));
  assert.equal(until, "2026-10-06T10:00:00.000Z");
  assert.equal(nurtureUntilFromChoice("custom", "2026-09-21", new Date("2026-09-22T10:00:00.000Z")), null);
  assert.equal(nurtureUntilFromChoice("custom", "2026-12-01", new Date("2026-09-22T10:00:00.000Z")), "2026-12-01T08:00:00.000Z");
});

test("korte follow-up rendert zonder de eerste mail te herhalen", async () => {
  const body = buildAutoFollowUpBody({ domain: "fluweel.nl", fit: "STANDARD_FIT", place: "Groesbeek" });
  const prepared = await prepareFollowUpEmail({
    subject: "Nog even over fluweel.nl",
    body,
    choiceAUrl: "https://kopvast.nl/start?keuze=voorstel",
    choiceBUrl: "https://kopvast.nl/start?keuze=info",
  });
  assert.match(prepared.text, /€995 excl\. btw/);
  assert.match(prepared.html, /Ja, doe me een voorstel/);
  assert.doesNotMatch(prepared.text, /Twee dingen vielen direct op/);
  assert.equal((prepared.text.match(/KOPVAST/g) ?? []).length, 1);
});

test("handmatige follow-up blijft een kort persoonlijk concept", () => {
  const body = buildManualFollowUpBody({ companyName: "Fluweel Events", domain: "fluweel.nl" });
  assert.match(body, /persoonlijk op terugkomen/);
  assert.doesNotMatch(body, /Twee dingen vielen direct op/);
});

test("scanvergelijking noemt wat veranderde", () => {
  const summary = summarizeScanChanges({
    previousFindings: [{ title: "Oud", category: "visual" }],
    nextFindings: [
      { title: "Oud", category: "visual" },
      { title: "Contact", category: "conversion" },
    ],
    previousScore: 70,
    nextScore: 78,
  });
  assert.match(summary.angle, /Contactroute/);
  assert.deepEqual(summary.same, ["Uitstraling"]);
  assert.equal(summary.scoreLine, "Score 70 → 78");
});
