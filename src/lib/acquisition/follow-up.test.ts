import assert from "node:assert/strict";
import test from "node:test";
import { prepareFollowUpEmail } from "@/lib/acquisition-render";
import { type ProspectDetail } from "@/lib/acquisition";
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
  readFollowUpCommercialFlags,
  showNoResponseChoices,
  snapshotFromDetail,
  summarizeScanChanges,
  type FollowUpFlagClient,
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
  assert.equal(
    followUpBlockReason(snapshot({ suppressionReason: "UNSUBSCRIBED", hasRequest: true, hasProposal: true })),
    "suppressed:UNSUBSCRIBED"
  );
  assert.equal(followUpBlockReason(snapshot({ alreadySent: true, hasProposal: true })), "already_sent");
  assert.equal(autoFollowUpIdempotencyKey("prospect-1"), "acquisition-follow-up/prospect-1");
  assert.equal(followUpBlockReason(snapshot({ doNotContact: true })), "do_not_contact");
  assert.equal(followUpBlockReason(snapshot({ mailStatus: "bounced" })), "bounced");
  assert.equal(followUpBlockReason(snapshot({ status: "CLOSED" })), "closed");
  assert.equal(followUpBlockReason(snapshot({ outreachPaused: true })), "paused");
  assert.equal(followUpBlockReason(snapshot({ alreadySent: true })), "already_sent");
});

function recordingFlagClient(hit: { prospect?: boolean; request?: boolean; customer?: boolean; error?: string } = {}) {
  const calls: Array<{ table: string; column: string; value: string }> = [];
  const client: FollowUpFlagClient = {
    from(table) {
      return {
        select() {
          return {
            eq(column, value) {
              calls.push({ table, column, value });
              return {
                limit: async () => {
                  if (table === "proposals" && column === "inbound_lead_id") {
                    return { data: null, error: { message: "column proposals.inbound_lead_id does not exist" } };
                  }
                  if (hit.error && table === "proposals" && column === "request_id") {
                    return { data: null, error: { message: hit.error } };
                  }
                  const matched =
                    (table === "proposals" && column === "prospect_id" && hit.prospect) ||
                    (table === "proposals" && column === "request_id" && hit.request) ||
                    (table === "kopvast_organizations" && column === "prospect_id" && hit.customer);
                  return { data: matched ? [{ id: `${table}-1` }] : [], error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

function quietDetail(overrides: Partial<ProspectDetail> = {}): ProspectDetail {
  return {
    response_status: "NO_RESPONSE",
    commercial_intent: null,
    commercial_stage: "PROSPECT",
    status: "SALES_READY",
    is_archived: false,
    do_not_contact: false,
    contact_status: "UNKNOWN",
    auto_outreach_blocked: false,
    outreach_paused: false,
    mail_status: "sent",
    nurture_status: null,
    auto_follow_up_sent_at: null,
    inbound_lead_id: null,
    contact: null,
    suppression: null,
    ...overrides,
  } as ProspectDetail;
}

test("voorstel bij een inbound request wordt via request_id geblokkeerd", async () => {
  const { client, calls } = recordingFlagClient({ request: true });
  const first = await readFollowUpCommercialFlags(client, "prospect-1", "request-1");
  const second = await readFollowUpCommercialFlags(client, "prospect-1", "request-1");

  assert.deepEqual(first, { hasProposal: true, hasCustomer: false });
  assert.deepEqual(second, first);
  assert.equal(calls.some((call) => call.column === "inbound_lead_id"), false);
  assert.deepEqual(
    calls.filter((call) => call.table === "proposals" && call.column === "request_id").map((call) => call.value),
    ["request-1", "request-1"]
  );

  const requested = snapshotFromDetail(quietDetail({ inbound_lead_id: "request-1" }), {
    hasProposal: false,
    hasCustomer: false,
  });
  assert.equal(followUpBlockReason(requested), "request");

  const proposed = snapshotFromDetail(quietDetail(), first);
  assert.equal(followUpBlockReason(proposed), "proposal");

  const converted = snapshotFromDetail(
    quietDetail({
      status: "CONVERTED",
      response_status: "QUESTION",
      commercial_intent: "MORE_INFO",
      commercial_stage: "ENGAGED",
      inbound_lead_id: "request-1",
    }),
    { hasProposal: false, hasCustomer: false }
  );
  assert.equal(followUpBlockReason(converted), "closed");
  assert.notEqual(followUpBlockReason(converted), null);
});

test("zonder aanvraag blijft de voorstelcontrole op prospect_id", async () => {
  const { client, calls } = recordingFlagClient({ prospect: true });
  const flags = await readFollowUpCommercialFlags(client, "prospect-1", null);
  assert.deepEqual(flags, { hasProposal: true, hasCustomer: false });
  assert.equal(calls.some((call) => call.column === "request_id" || call.column === "inbound_lead_id"), false);
  assert.equal(followUpBlockReason(snapshotFromDetail(quietDetail(), flags)), "proposal");
});

test("een databasefout bij de voorstelcontrole is geen toestemming om te mailen", async () => {
  const { client } = recordingFlagClient({ error: "column proposals.request_id does not exist" });
  const flags = await readFollowUpCommercialFlags(client, "prospect-1", "request-1");
  if ("error" in flags) {
    assert.match(flags.error, /does not exist/);
    return;
  }
  assert.fail("verwachte databasefout");
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
