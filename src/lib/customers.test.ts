import assert from "node:assert/strict";
import test from "node:test";
import {
  activityFromRecords,
  brandAssets,
  customerMatchesFilter,
  customerSearchHaystack,
  isBeheerActive,
  listFactsForCustomer,
  mergeActivity,
  nextActionLabel,
  normalizeWebsiteHost,
  resolveCustomerMatch,
} from "./customers";

const org = {
  id: "org-1",
  name: "Ardea Studio",
  website: "https://www.ardea.studio",
  inbound_lead_id: "lead-1",
  prospect_id: "prospect-1",
  memberEmails: ["eva@ardea.studio"],
};

test("normalizeWebsiteHost haalt www en protocol weg", () => {
  assert.equal(normalizeWebsiteHost("https://www.ardea.studio/over"), "ardea.studio");
  assert.equal(normalizeWebsiteHost("ardea.studio"), "ardea.studio");
  assert.equal(normalizeWebsiteHost("  "), null);
});

test("reeds gekoppelde customer wint", () => {
  const result = resolveCustomerMatch({ organizationId: "org-1", email: "other@example.com" }, [org]);
  assert.equal(result.kind, "linked");
  if (result.kind === "linked") assert.equal(result.organizationId, "org-1");
});

test("betrouwbare unieke relatie koppelt op e-mail of website", () => {
  const byEmail = resolveCustomerMatch({ email: "eva@ardea.studio" }, [org]);
  assert.equal(byEmail.kind, "unique");
  if (byEmail.kind === "unique") assert.equal(byEmail.reason, "email");

  const bySite = resolveCustomerMatch({ website: "http://ardea.studio" }, [org]);
  assert.equal(bySite.kind, "unique");
  if (bySite.kind === "unique") assert.equal(bySite.reason, "website");

  const byLead = resolveCustomerMatch({ inboundLeadId: "lead-1" }, [org]);
  assert.equal(byLead.kind, "unique");
  if (byLead.kind === "unique") assert.equal(byLead.reason, "lead");
});

test("bij twijfel geen stille merge", () => {
  const other = { ...org, id: "org-2", inbound_lead_id: "lead-2", prospect_id: "prospect-2", memberEmails: ["info@other.nl"], website: "https://other.nl" };
  const clash = resolveCustomerMatch({ inboundLeadId: "lead-1", email: "info@other.nl" }, [org, other]);
  assert.equal(clash.kind, "review");
  if (clash.kind === "review") assert.equal(clash.candidates.length, 2);

  const named = resolveCustomerMatch({ companyName: "Ardea Studio", email: "nieuw@example.com" }, [org]);
  assert.equal(named.kind, "review");
  if (named.kind === "review") assert.equal(named.candidates[0]?.reason, "gelijknamig bedrijf");

  const none = resolveCustomerMatch({ email: "nieuw@example.com", website: "https://nieuw.example", companyName: "Nieuw Bedrijf" }, [org]);
  assert.equal(none.kind, "none");
});

test("filters volgen status, productie, live, beheer en support", () => {
  const facts = {
    status: "active",
    beheerActive: true,
    openSupport: true,
    inProduction: true,
    isLive: false,
  };
  assert.equal(customerMatchesFilter("actief", facts), true);
  assert.equal(customerMatchesFilter("onboarding", facts), false);
  assert.equal(customerMatchesFilter("productie", facts), true);
  assert.equal(customerMatchesFilter("live", { ...facts, isLive: true }), true);
  assert.equal(customerMatchesFilter("beheer", facts), true);
  assert.equal(customerMatchesFilter("support", facts), true);
});

test("volgende actie kiest de meest urgente open post", () => {
  assert.equal(
    nextActionLabel({
      reviews: [{ status: "open" }],
      support: [],
      requests: [],
      projects: [],
      proposals: [],
      invoices: [],
      organizationStatus: "active",
    }),
    "Dubbele klant beoordelen"
  );
  assert.equal(
    nextActionLabel({
      reviews: [],
      support: [{ status: "open", title: "DNS" }],
      requests: [{ status: "nieuw", title: "Hero" }],
      projects: [],
      proposals: [],
      invoices: [],
      organizationStatus: "active",
    }),
    "Support: DNS"
  );
  assert.equal(
    nextActionLabel({
      reviews: [],
      support: [],
      requests: [],
      projects: [],
      proposals: [],
      invoices: [],
      organizationStatus: "onboarding",
    }),
    "Rond onboarding af"
  );
});

test("overzichtsrij toont contact, opdracht, beheer en open actie", () => {
  const facts = listFactsForCustomer({
    organization: { status: "onboarding", website: "https://ardea.studio" },
    members: [{ name: "Eva", email: "eva@ardea.studio", role: "owner" }],
    projects: [
      { type: "website", status: "in_uitvoering", title: "Kopvast Website" },
      { type: "beheer", status: "voorbereiding", title: "Kopvast Beheer" },
    ],
    requests: [],
    support: [],
    proposals: [],
    invoices: [],
  });
  assert.equal(facts.contactName, "Eva");
  assert.equal(facts.activeOrder, "Kopvast Website");
  assert.equal(facts.beheerActive, true);
  assert.equal(facts.inProduction, true);
  assert.match(facts.nextAction ?? "", /Opdracht loopt/);
  assert.equal(isBeheerActive([{ type: "beheer", status: "opgezegd" }]), false);
});

test("zoekveld kijkt naar organisatie, website en contact", () => {
  const hay = customerSearchHaystack({
    name: "Ardea Studio",
    website: "ardea.studio",
    contactName: "Eva",
    contactEmail: "eva@ardea.studio",
  });
  assert.match(hay, /eva@ardea.studio/);
  assert.match(hay, /ardea/);
});

test("activiteit combineert bronnen zonder duplicaten", () => {
  const rows = activityFromRecords({
    organizationId: "org-1",
    organization: { created_at: "2026-01-01T00:00:00.000Z", status: "onboarding", name: "Ardea" },
    leads: [{ id: "lead-1", created_at: "2026-01-02T00:00:00.000Z", company_name: "Ardea", name: "Eva", status: "OMGEZET" }],
    proposals: [{ id: "p1", title: "Websitevoorstel", status: "geaccepteerd", created_at: "2026-01-03T00:00:00.000Z", accepted_at: "2026-01-04T00:00:00.000Z" }],
    projects: [{ id: "pr1", title: "Kopvast Website", status: "in_uitvoering", type: "website", created_at: "2026-01-05T00:00:00.000Z" }],
    requests: [],
    invoices: [],
    support: [{ id: "s1", title: "DNS", status: "open", created_at: "2026-01-06T00:00:00.000Z" }],
    notes: [{ id: "n1", body: "Kick-off gepland", created_at: "2026-01-07T00:00:00.000Z" }],
  });
  const sources = new Set(rows.map((item) => item.source));
  assert.equal(sources.has("onboarding"), true);
  assert.equal(sources.has("request"), true);
  assert.equal(sources.has("proposal"), true);
  assert.equal(sources.has("website"), true);
  assert.equal(sources.has("support"), true);
  assert.equal(sources.has("note"), true);
  assert.equal(rows[0]?.source, "note");
  assert.equal(mergeActivity([...rows, rows[0]!]).length, rows.length);
});

test("merk toont alleen bestaande logo- en huisstijlbestanden", () => {
  const shown = brandAssets([
    { kind: "logo", name: "Logo", url: "https://cdn.example/logo.svg", note: null },
    { kind: "foto", name: "Sfeer", url: "https://cdn.example/sfeer.jpg", note: null },
  ]);
  assert.equal(shown.length, 1);
  assert.equal(shown[0]?.name, "Logo");
});
