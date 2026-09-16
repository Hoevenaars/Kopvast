import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ONBOARDING_ITEMS,
  MAATWERK_ONBOARDING_ITEMS,
  buildOnboardingRecords,
  containsSecret,
  deriveOnboardingStatus,
  formatMissingLine,
  formatReceivedLine,
  isAllowedOnboardingMime,
  itemHasInput,
  itemsBySection,
  nextItemStatus,
  onboardingProgress,
  onboardingStorageKey,
  parseCustomItemInput,
  progressLines,
  projectNeedsOnboarding,
  sanitizeFileName,
  templatesForProjectType,
  validateOnboardingFile,
  validateOnboardingText,
} from "./onboarding";

test("website-onboarding heeft de verplichte poorten en optionele kvk/btw", () => {
  const items = templatesForProjectType("website");
  assert.equal(items, DEFAULT_ONBOARDING_ITEMS);
  assert.ok(items.some((item) => item.key === "logo" && item.required));
  assert.ok(items.some((item) => item.key === "fotos" && item.required));
  assert.ok(items.some((item) => item.key === "dns" && item.required));
  assert.ok(items.some((item) => item.key === "kvk" && !item.required));
  assert.ok(items.some((item) => item.key === "btw" && !item.required));
  assert.ok(!items.some((item) => item.section === "maatwerk"));
});

test("maatwerk krijgt extra checklist-items", () => {
  const items = templatesForProjectType("maatwerk");
  assert.equal(items.length, DEFAULT_ONBOARDING_ITEMS.length + MAATWERK_ONBOARDING_ITEMS.length);
  assert.ok(items.some((item) => item.key === "scope" && item.section === "maatwerk"));
  assert.equal(projectNeedsOnboarding("website"), true);
  assert.equal(projectNeedsOnboarding("maatwerk"), true);
  assert.equal(projectNeedsOnboarding("beheer"), false);
});

test("ready-gate telt alleen verplichte items", () => {
  const items = [
    { id: "1", title: "Logo", required: true, status: "received" as const },
    { id: "2", title: "Contactgegevens", required: true, status: "approved" as const },
    { id: "3", title: "Foto's", required: true, status: "missing" as const },
    { id: "4", title: "DNS", required: true, status: "missing" as const },
    { id: "5", title: "KVK", required: false, status: "missing" as const },
  ];
  const progress = onboardingProgress({ status: "open", override_reason: null }, items);
  assert.equal(progress.summary, "Onboarding 2/4 compleet");
  assert.equal(progress.ready, false);
  assert.deepEqual(
    progressLines(progress),
    ["Onboarding 2/4 compleet", "✓ Logo", "✓ Contactgegevens", "! Foto's ontbreekt", "! DNS ontbreekt"]
  );
  assert.equal(formatReceivedLine("Logo"), "✓ Logo");
  assert.equal(formatMissingLine("Foto's"), "! Foto's ontbreekt");
});

test("READY als verplichte items RECEIVED, NOT_REQUIRED of APPROVED zijn", () => {
  const items = [
    { id: "1", title: "Logo", required: true, status: "received" as const },
    { id: "2", title: "DNS", required: true, status: "not_required" as const },
    { id: "3", title: "Tone", required: true, status: "approved" as const },
    { id: "4", title: "KVK", required: false, status: "missing" as const },
  ];
  const progress = onboardingProgress({ status: "open", override_reason: null }, items);
  assert.equal(progress.ready, true);
  assert.equal(progress.completed, 3);
  assert.deepEqual(deriveOnboardingStatus({ overrideReason: null, items, now: "2026-09-16T10:00:00.000Z" }), {
    status: "ready",
    ready_at: "2026-09-16T10:00:00.000Z",
  });
});

test("rejected blokkeert ready, override met reden wint", () => {
  const items = [{ id: "1", title: "Logo", required: true, status: "rejected" as const }];
  assert.equal(onboardingProgress({ status: "open", override_reason: null }, items).ready, false);
  assert.equal(deriveOnboardingStatus({ overrideReason: null, items, now: "now" }).status, "open");
  const overridden = onboardingProgress({ status: "open", override_reason: "Start parallel, logo volgt." }, items);
  assert.equal(overridden.ready, true);
  assert.equal(
    deriveOnboardingStatus({ overrideReason: "Start parallel, logo volgt.", items, now: "now" }).status,
    "ready"
  );
});

test("niet van toepassing en invoer bepalen de itemstatus", () => {
  assert.equal(nextItemStatus({ current: "missing", required: true, notRequired: true, hasInput: false }), "not_required");
  assert.equal(nextItemStatus({ current: "missing", required: true, notRequired: false, hasInput: true }), "received");
  assert.equal(nextItemStatus({ current: "approved", required: true, notRequired: false, hasInput: true }), "approved");
  assert.equal(nextItemStatus({ current: "rejected", required: true, notRequired: false, hasInput: false }), "rejected");
  assert.equal(nextItemStatus({ current: "rejected", required: true, notRequired: false, hasInput: true }), "received");
  assert.equal(itemHasInput({ value_text: "Atelier Lint", item_type: "text" }, 0), true);
  assert.equal(itemHasInput({ value_text: "", item_type: "file" }, 1), true);
  assert.equal(itemHasInput({ value_text: "  ", item_type: "textarea" }, 0), false);
});

test("bestanden: MIME-allowlist, limiet en veilige storage keys", () => {
  assert.equal(isAllowedOnboardingMime("image/png"), true);
  assert.equal(isAllowedOnboardingMime("application/x-msdownload"), false);
  assert.equal(validateOnboardingFile({ name: "logo.png", mime: "image/png", size: 1200 }).ok, true);
  assert.equal(validateOnboardingFile({ name: "virus.exe", mime: "application/x-msdownload", size: 12 }).ok, false);
  assert.equal(validateOnboardingFile({ name: "huge.png", mime: "image/png", size: 11 * 1024 * 1024 }).ok, false);
  assert.equal(sanitizeFileName("../../etc/passwd"), "passwd");
  assert.equal(sanitizeFileName("Logo Definitief (1).PNG"), "logo-definitief-1-.png");
  assert.equal(
    onboardingStorageKey({
      organizationId: "org-1",
      projectId: "proj-1",
      itemId: "item-1",
      fileId: "file-1",
      fileName: "Logo Definitief.PNG",
    }),
    "onboarding/org-1/proj-1/item-1/file-1/logo-definitief.png"
  );
  assert.throws(() =>
    onboardingStorageKey({
      organizationId: "../x",
      projectId: "p",
      itemId: "i",
      fileId: "f",
      fileName: "a.png",
    })
  );
});

test("slaat geen geheimen als gewone tekst op", () => {
  assert.equal(containsSecret("G-ABCDEF123"), false);
  assert.equal(containsSecret("sk-abcdefghijklmnopqrstuvwxyz"), true);
  assert.equal(containsSecret("api_key=supersecretvalue"), true);
  assert.equal(containsSecret("password: hunter2"), true);
  assert.equal(validateOnboardingText("Atelier Lint").ok, true);
  assert.equal(validateOnboardingText("Bearer abcdefghijklmnop").ok, false);
});

test("maatwerk mag extra items krijgen", () => {
  const parsed = parseCustomItemInput({
    title: "Boekingssysteem",
    section: "maatwerk",
    itemType: "textarea",
    required: true,
    helpText: "Welke flows, geen wachtwoorden.",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.section, "maatwerk");
    assert.equal(parsed.required, true);
    assert.match(parsed.key, /^custom-/);
  }
  assert.equal(parseCustomItemInput({ title: "x" }).ok, false);
});

test("secties groeperen items in vaste volgorde", () => {
  let n = 0;
  const built = buildOnboardingRecords({
    projectId: "p1",
    organizationId: "o1",
    projectType: "website",
    now: "2026-09-16T10:00:00.000Z",
    newId: () => `id-${++n}`,
  });
  assert.equal(built.onboarding.status, "open");
  assert.equal(built.items.length, DEFAULT_ONBOARDING_ITEMS.length);
  const sections = itemsBySection(built.items);
  assert.deepEqual(
    sections.map((item) => item.id),
    ["bedrijf", "merk", "content", "techniek", "inspiratie"]
  );
});
