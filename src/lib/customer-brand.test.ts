import assert from "node:assert/strict";
import test from "node:test";
import { customerBrandFromSources, customerPagesFromSources, firstHexColor } from "./customer-brand";
import type { OnboardingFileRow, OnboardingItemRow } from "./onboarding";

function item(overrides: Partial<OnboardingItemRow> & Pick<OnboardingItemRow, "key" | "section">): OnboardingItemRow {
  return {
    id: overrides.id ?? overrides.key,
    onboarding_id: "onb-1",
    title: overrides.key,
    help_text: null,
    item_type: "textarea",
    required: false,
    custom: false,
    status: "received",
    value_text: null,
    note: null,
    admin_note: null,
    sort_order: 0,
    created_at: "2026-09-21T00:00:00.000Z",
    updated_at: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

test("leest de eerste hexkleur uit onboardingtekst", () => {
  assert.equal(firstHexColor("Koper #A64D27 en ivoor"), "#A64D27");
  assert.equal(firstHexColor("geen kleur"), null);
});

test("toont onboarding-merk en logo, niet ComingSoon", () => {
  const files: OnboardingFileRow[] = [
    {
      id: "file-1",
      onboarding_id: "onb-1",
      item_id: "logo",
      organization_id: "org-1",
      project_id: "p-1",
      storage_key: "onboarding/logo.png",
      original_name: "fluweel-logo.png",
      mime_type: "image/png",
      size_bytes: 12,
      uploaded_by: "eva@fluweel.nl",
      created_at: "2026-09-21T00:00:00.000Z",
    },
  ];
  const view = customerBrandFromSources({
    organizationName: "Fluweel Events",
    brand: null,
    items: [
      item({ key: "logo", section: "merk", item_type: "file" }),
      item({ key: "kleuren", section: "merk", value_text: "Koper #A64D27" }),
      item({ key: "tone", section: "merk", value_text: "Warm en nuchter" }),
      item({ key: "fonts", section: "merk", value_text: "Source Serif" }),
      item({ key: "paginas", section: "content", value_text: "Home, Over, Contact" }),
    ],
    files,
    assets: [],
  });
  assert.equal(view.hasContent, true);
  assert.equal(view.primaryColor, "#A64D27");
  assert.equal(view.tone, "Warm en nuchter");
  assert.equal(view.typography, "Source Serif");
  assert.equal(view.files[0]?.name, "fluweel-logo.png");
  assert.equal(view.files[0]?.href, "/api/onboarding/files/file-1");
});

test("leeg merk blijft leeg tot onboarding of profiel er is", () => {
  const view = customerBrandFromSources({
    organizationName: "Fluweel Events",
    brand: null,
    items: [item({ key: "kleuren", section: "merk", value_text: "   " })],
    files: [],
    assets: [],
  });
  assert.equal(view.hasContent, false);
});

test("bestaand brand profile wint van onboarding voor kleur en toon", () => {
  const view = customerBrandFromSources({
    organizationName: "Fluweel Events",
    brand: {
      organization_id: "org-1",
      name: "Fluweel",
      tagline: "Events met rust",
      primary_color: "#111111",
      secondary_color: "#EEEEEE",
      typography: "GT Sectra",
      tone: "Kalm",
      notes: null,
      updated_at: "2026-09-21T00:00:00.000Z",
    },
    items: [item({ key: "kleuren", section: "merk", value_text: "#A64D27" }), item({ key: "tone", section: "merk", value_text: "Warm" })],
    files: [],
    assets: [{ id: "a1", kind: "logo", name: "Logo", url: "https://cdn.example/logo.svg" }],
  });
  assert.equal(view.primaryColor, "#111111");
  assert.equal(view.tone, "Kalm");
  assert.equal(view.files.some((item) => item.name === "Logo"), true);
});

test("pakt de eerste ingevulde merktekst als er meerdere checklists zijn", () => {
  const view = customerBrandFromSources({
    organizationName: "Fluweel Events",
    brand: null,
    items: [
      item({ id: "tone-empty", key: "tone", section: "merk", value_text: "" }),
      item({ id: "tone-full", key: "tone", section: "merk", value_text: "Warm en nuchter" }),
      item({ id: "kleuren-empty", key: "kleuren", section: "merk", value_text: "  " }),
      item({ id: "kleuren-full", key: "kleuren", section: "merk", value_text: "#A64D27" }),
    ],
    files: [],
    assets: [],
  });
  assert.equal(view.tone, "Warm en nuchter");
  assert.equal(view.primaryColor, "#A64D27");
});

test("pagina-overzicht komt uit onboarding, niet uit een pagebuilder", () => {
  const pages = customerPagesFromSources([
    item({ key: "paginas", section: "content", value_text: "Home\nOver ons\nContact" }),
  ]);
  assert.equal(pages.outline, "Home\nOver ons\nContact");
  assert.equal(customerPagesFromSources([]).outline, null);
});
