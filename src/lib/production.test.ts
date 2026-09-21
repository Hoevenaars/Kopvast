import assert from "node:assert/strict";
import test from "node:test";
import {
  allChangesDone,
  canMarkLive,
  canResubmitReview,
  canSendToReview,
  checklistComplete,
  customerAttention,
  defaultNextAction,
  emptyLaunchChecks,
  isDeliveryProject,
  launchCheckStats,
  nextStatusAfterChecklist,
  parseApproval,
  parseChangeRequest,
  productionsByColumn,
  projectStatusForProduction,
  orderStatusForProduction,
  seedProductionFields,
} from "./production";

test("alleen opleverprojecten horen in productie", () => {
  assert.equal(isDeliveryProject("website"), true);
  assert.equal(isDeliveryProject("maatwerk"), true);
  assert.equal(isDeliveryProject("beheer"), false);
});

test("volgende actie volgt de pijplijn", () => {
  assert.equal(defaultNextAction("ready_for_production", { onboardingComplete: false }), "Rond onboarding af");
  assert.equal(defaultNextAction("ready_for_production", { onboardingComplete: true }), "Start productie");
  assert.equal(defaultNextAction("changes", { onboardingComplete: true, openChanges: 2 }), "Werk openstaande wijzigingen af");
  assert.equal(defaultNextAction("changes", { onboardingComplete: true, openChanges: 0 }), "Stuur opnieuw ter review");
  assert.equal(defaultNextAction("live", { onboardingComplete: true }), "Factuur / beheercheck");
});

test("projectstatus volgt productiestatus", () => {
  assert.equal(projectStatusForProduction("in_production"), "in_uitvoering");
  assert.equal(projectStatusForProduction("client_review"), "wacht_op_klant");
  assert.equal(projectStatusForProduction("ready_to_launch"), "opgeleverd");
  assert.equal(projectStatusForProduction("live"), "live");
});

test("opdrachtstatus volgt productiestatus", () => {
  assert.equal(orderStatusForProduction("ready_for_production"), "READY_FOR_PRODUCTION");
  assert.equal(orderStatusForProduction("in_production"), "IN_PRODUCTION");
  assert.equal(orderStatusForProduction("client_review"), "CLIENT_REVIEW");
  assert.equal(orderStatusForProduction("changes"), "CHANGES");
  assert.equal(orderStatusForProduction("approved"), "APPROVED");
  assert.equal(orderStatusForProduction("ready_to_launch"), "READY_TO_LAUNCH");
  assert.equal(orderStatusForProduction("live"), "LIVE");
});

test("klantreview vereist preview-URL en boodschap", () => {
  assert.equal(canSendToReview({ previewUrl: "", reviewMessage: "Bekijk het concept." }).ok, false);
  assert.equal(canSendToReview({ previewUrl: "niet-een-url", reviewMessage: "Bekijk het concept." }).ok, false);
  const ok = canSendToReview({ previewUrl: "https://preview.kopvast.nl/ardea", reviewMessage: "Bekijk het concept." });
  assert.equal(ok.ok, true);
});

test("opnieuw ter review pas als alle changes klaar zijn", () => {
  assert.equal(canResubmitReview([]).ok, false);
  assert.equal(canResubmitReview([{ status: "OPEN" }, { status: "DONE" }]).ok, false);
  assert.equal(allChangesDone([{ status: "DONE" }, { status: "DONE" }]), true);
  assert.equal(canResubmitReview([{ status: "DONE" }]).ok, true);
});

test("livegang vereist definitief akkoord en checklist", () => {
  const checks = emptyLaunchChecks();
  assert.equal(canMarkLive({ status: "approved", finalApproved: false, checks }).ok, false);
  for (const key of Object.keys(checks) as Array<keyof typeof checks>) checks[key] = true;
  assert.equal(canMarkLive({ status: "approved", finalApproved: true, checks }).ok, true);
  assert.equal(canMarkLive({ status: "live", finalApproved: true, checks }).ok, false);
});

test("checklist tilt goedgekeurd naar klaar voor livegang", () => {
  const checks = emptyLaunchChecks();
  assert.equal(nextStatusAfterChecklist({ status: "approved", finalApproved: true, checks }), "approved");
  for (const key of Object.keys(checks) as Array<keyof typeof checks>) checks[key] = true;
  assert.equal(checklistComplete(checks, true), true);
  assert.equal(nextStatusAfterChecklist({ status: "approved", finalApproved: true, checks }), "ready_to_launch");
});

test("wijziging en akkoord valideren invoer", () => {
  assert.equal(parseChangeRequest({ pageSection: "Home", body: "kort" }).ok, false);
  const change = parseChangeRequest({ pageSection: "Home", body: "Zet het telefoonnummer goed." });
  assert.equal(change.ok, true);
  assert.equal(parseApproval({ name: "A", email: "x" }).ok, false);
  const approval = parseApproval({ name: "Eva Jansen", email: "eva@ardea.studio" });
  assert.equal(approval.ok, true);
});

test("bord groepeert actieve kaarten en laat live buiten de kolommen", () => {
  const card = {
    ...seedProductionFields({ id: "p1", organization_id: "o1", summary: "Website", due_at: "2026-10-01" }),
    id: "prod-1",
    created_at: "2026-09-16",
    updated_at: "2026-09-16",
    customer: "Ardea",
    order: "Kopvast Website",
    website: "ardea.studio",
    project_type: "website" as const,
    project_status: "voorbereiding" as const,
    beheer_sold: true,
    open_changes: 0,
    concept_approved: false,
    final_approved: false,
  };
  const columns = productionsByColumn([card, { ...card, id: "prod-2", status: "live" }]);
  assert.equal(columns[0]?.items.length, 1);
  assert.equal(columns.length, 6);
  assert.equal(columns.every((column) => column.items.every((item) => item.status !== "live")), true);
});

test("klant ziet aandachtspunten bij review en akkoord", () => {
  const base = {
    ...seedProductionFields({ id: "p1", organization_id: "o1", summary: null, due_at: null }),
    id: "prod-1",
    created_at: "2026-09-16",
    updated_at: "2026-09-16",
    customer: "Ardea",
    order: "Kopvast Website",
    website: null,
    project_type: "website" as const,
    project_status: "wacht_op_klant" as const,
    beheer_sold: true,
    open_changes: 0,
    concept_approved: false,
    final_approved: false,
    status: "client_review" as const,
  };
  const items = customerAttention([base]);
  assert.equal(items[0]?.href, "/klant/goedkeuringen");
  assert.match(items[0]?.title ?? "", /akkoord/);
});

test("checklist telt afgeronde stappen", () => {
  const checks = emptyLaunchChecks();
  assert.deepEqual(launchCheckStats(checks), { total: 14, done: 0, complete: false });
  checks.ssl = true;
  assert.equal(launchCheckStats(checks).done, 1);
});
