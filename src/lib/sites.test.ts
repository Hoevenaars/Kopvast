import assert from "node:assert/strict";
import test from "node:test";
import {
  beheerSummary,
  buildBeheerCatalog,
  buildSupportInbox,
  buildWebsiteCatalog,
  customerWebsiteOptions,
  defaultBeheerAmount,
  domainFromWebsite,
  formatEuro,
  hasLiveWebsite,
  monthlyAmountFor,
  openSupportActions,
  parseEuroAmount,
  productionUrlFromWebsite,
  resolveRequestType,
  websiteHealth,
  type CatalogOrganization,
  type CatalogProject,
  type CatalogRequest,
} from "./sites";

const org: CatalogOrganization = {
  id: "org-1",
  name: "Atelier Lint",
  website: "https://www.atelierlint.nl",
};

function project(partial: Partial<CatalogProject> & Pick<CatalogProject, "id" | "type">): CatalogProject {
  return {
    organization_id: org.id,
    title: partial.type === "beheer" ? "Kopvast Beheer" : "Kopvast Website",
    status: "live",
    price_label: null,
    started_at: "2026-08-01",
    live_at: "2026-09-01",
    summary: null,
    primary_domain: "atelierlint.nl",
    preview_url: "https://preview.atelierlint.nl",
    production_url: "https://atelierlint.nl",
    monthly_amount: null,
    included_note: null,
    last_checked_at: "2026-09-10T10:00:00.000Z",
    technical_note: null,
    ...partial,
  };
}

function request(partial: Partial<CatalogRequest> & Pick<CatalogRequest, "id">): CatalogRequest {
  return {
    organization_id: org.id,
    project_id: "web-1",
    created_by_email: "eva@atelierlint.nl",
    type: "post_launch",
    title: "Telefoonnummer",
    body: "Zet het nieuwe nummer op contact.",
    status: "nieuw",
    classification: null,
    file_name: null,
    file_url: null,
    created_at: "2026-09-16T08:00:00.000Z",
    updated_at: "2026-09-16T08:00:00.000Z",
    ...partial,
  };
}

test("haalt domein en productielink uit een website-url", () => {
  assert.equal(domainFromWebsite("https://www.atelierlint.nl/home"), "atelierlint.nl");
  assert.equal(domainFromWebsite("atelierlint.nl"), "atelierlint.nl");
  assert.equal(productionUrlFromWebsite("atelierlint.nl"), "https://atelierlint.nl");
  assert.equal(parseEuroAmount("€199 per maand, excl. btw"), 199);
  assert.equal(parseEuroAmount("€1.495 eenmalig"), 1495);
  assert.equal(defaultBeheerAmount(), 199);
  assert.match(formatEuro(398).replace(/\s/g, ""), /€398/);
});

test("zet wijzigingen na livegang om naar post_launch", () => {
  assert.equal(resolveRequestType({ type: "wijziging", websiteIsLive: true }), "post_launch");
  assert.equal(resolveRequestType({ type: "vraag", websiteIsLive: true }), "vraag");
  assert.equal(resolveRequestType({ source: "support", websiteIsLive: true }), "post_launch");
  assert.equal(resolveRequestType({ source: "support", websiteIsLive: false }), "vraag");
});

test("website-overzicht toont klant, beheer en open support", () => {
  const websites = buildWebsiteCatalog(
    [org],
    [
      project({ id: "web-1", type: "website" }),
      project({
        id: "beh-1",
        type: "beheer",
        monthly_amount: 199,
        included_note: "Twee kleine wijzigingen per maand.",
      }),
    ],
    [request({ id: "req-1" })]
  );
  assert.equal(websites.length, 1);
  assert.equal(websites[0]?.customerName, "Atelier Lint");
  assert.equal(websites[0]?.domain, "atelierlint.nl");
  assert.equal(websites[0]?.beheerActive, true);
  assert.equal(websites[0]?.openSupport, 1);
  assert.equal(websites[0]?.health.label, "Open support");
  assert.equal(websites[0]?.health.needsAction, true);
});

test("MRR telt alleen actieve maandbedragen", () => {
  const records = buildBeheerCatalog(
    [org, { id: "org-2", name: "Studio Vale", website: "vale.studio" }],
    [
      project({ id: "web-1", type: "website" }),
      project({ id: "beh-1", type: "beheer", monthly_amount: 199 }),
      project({
        id: "web-2",
        type: "website",
        organization_id: "org-2",
        primary_domain: "vale.studio",
      }),
      project({
        id: "beh-2",
        type: "beheer",
        organization_id: "org-2",
        status: "opgezegd",
        monthly_amount: 199,
      }),
    ],
    []
  );
  const summary = beheerSummary(records);
  assert.equal(summary.managedCount, 1);
  assert.equal(summary.mrr, 199);
  assert.equal(monthlyAmountFor(project({ id: "beh-3", type: "beheer", price_label: "€199 per maand" })), 199);
});

test("stale check of pauze zet beheer op actie nodig", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  assert.deepEqual(
    websiteHealth({
      status: "live",
      openSupport: 0,
      beheerActive: true,
      lastCheckedAt: "2026-07-01T10:00:00.000Z",
      now,
    }),
    { label: "Check nodig", needsAction: true }
  );
  const paused = buildBeheerCatalog(
    [org],
    [
      project({ id: "web-1", type: "website" }),
      project({ id: "beh-1", type: "beheer", status: "gepauzeerd", last_checked_at: now.toISOString() }),
    ],
    [],
    now
  );
  assert.equal(paused[0]?.needsAction, true);
  const healthy = buildBeheerCatalog(
    [org],
    [
      project({ id: "web-1", type: "website" }),
      project({ id: "beh-1", type: "beheer", last_checked_at: now.toISOString() }),
    ],
    [],
    now
  );
  const summary = beheerSummary(healthy);
  assert.equal(summary.healthyCount, 1);
  assert.equal(summary.needsActionCount, 0);
});

test("supportinbox koppelt post-launch wijzigingen en open acties", () => {
  const inbox = buildSupportInbox(
    [org],
    [project({ id: "web-1", type: "website" })],
    [
      request({ id: "req-1" }),
      request({ id: "req-2", type: "vraag", status: "klaar", title: "DNS" }),
    ]
  );
  assert.equal(inbox[0]?.postLaunch, true);
  assert.equal(inbox[0]?.customerName, "Atelier Lint");
  const actions = openSupportActions(inbox, Date.parse("2026-09-16T10:00:00.000Z"));
  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.status, "Open support");
  assert.equal(actions[0]?.href, "/admin/support");
});

test("klant ziet live websites als keuze", () => {
  const options = customerWebsiteOptions(
    [project({ id: "web-1", type: "website" }), project({ id: "beh-1", type: "beheer" })],
    org
  );
  assert.deepEqual(options, [{ id: "web-1", label: "atelierlint.nl", live: true }]);
  assert.equal(hasLiveWebsite([project({ id: "web-1", type: "website" })]), true);
  assert.equal(hasLiveWebsite([project({ id: "web-1", type: "website", status: "voorbereiding" })]), false);
});
