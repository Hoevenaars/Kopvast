import assert from "node:assert/strict";
import test from "node:test";
import { acceptProposal, createProposal, loadProposal, sendProposal } from "./proposal-ops";
import { activateRecurringForOrganization } from "./production-board";
import {
  formatPrice,
  getAcquisitionOffer,
  getProduct,
  PRODUCT_CATALOG,
  proposalLineFromProduct,
  recurringLivePatch,
} from "./products";
import { projectsFromSnapshot, snapshotContent, type ProposalDraftInput } from "./proposals";
import { beheerSummary, buildBeheerCatalog } from "./sites";
import { readStore, withIsolatedStore } from "./workspace-store";

test("catalogus houdt website, hosting, hosting plus en beheer uit elkaar", () => {
  assert.equal(getProduct("website_standard")?.priceExVat, 1495);
  assert.equal(getProduct("website_standard")?.priceType, "FIXED");
  assert.equal(getProduct("website_standard")?.billingType, "ONE_TIME");
  const hosting = getProduct("hosting");
  assert.equal(hosting?.priceExVat, 49.5);
  assert.equal(hosting?.priceType, "FROM");
  assert.equal(hosting?.billingType, "MONTHLY");
  assert.equal(getProduct("hosting_plus")?.priceExVat, 99);
  assert.equal(getProduct("hosting_plus")?.priceType, "FIXED");
  assert.equal(getProduct("managed")?.priceExVat, 199);
  assert.equal(getProduct("managed")?.category, "MANAGEMENT");
  assert.equal(getAcquisitionOffer("regional_acquisition_offer")?.productId, "website_standard");
  assert.equal(getAcquisitionOffer("regional_acquisition_offer")?.offerPriceExVat, 995);
  assert.notEqual(getProduct("custom_website")?.priceExVat, 995);
});

test("formatteert bedragen in het Nederlands", () => {
  assert.equal(formatPrice(49.5), "€49,50");
  assert.equal(formatPrice(1495), "€1.495");
  assert.equal(formatPrice(99), "€99");
});

test("hosting toevoegen vult de catalogusprijs en een override blijft de snapshot", () => {
  const hosting = getProduct("hosting");
  assert.ok(hosting);
  const filled = proposalLineFromProduct(hosting);
  assert.equal(filled.kind, "recurring");
  assert.equal(filled.unitPriceCents, 4950);
  assert.equal(filled.title, "Kopvast Hosting");
  const overridden = proposalLineFromProduct(hosting, { unitPriceExVat: 79 });
  assert.equal(overridden.unitPriceCents, 7900);
  const snapshot = snapshotContent({
    number: "KOP-2026-0042",
    version: 1,
    type: "maatwerk",
    title: "Voorstel",
    intro: "",
    aanleiding: "",
    scopeSummary: "Maatwerk",
    planning: "",
    validity: "",
    organization: "Ardea",
    recipientName: "Eva",
    recipientEmail: "eva@ardea.studio",
    lines: [
      { kind: "scope", title: "Maatwerk website", description: "", quantity: 1, unitPriceCents: 385000 },
      overridden,
    ],
    sentAt: "2026-09-22T10:00:00.000Z",
  });
  const projects = projectsFromSnapshot(snapshot);
  const service = projects.find((item) => item.type === "hosting");
  assert.equal(service?.monthly_amount, 79);
  assert.equal(getProduct("hosting")?.priceExVat, 49.5);
  assert.match(service?.price_label ?? "", /79/);
});

test("livegang maakt pending hosting actief zonder het afgesproken tarief te wijzigen", () => {
  const pending = {
    type: "hosting",
    status: "voorbereiding",
    monthly_amount: 79,
    started_at: null,
    live_at: null,
  };
  const patch = recurringLivePatch(pending, "2026-09-22", PRODUCT_CATALOG.find((item) => item.id === "hosting")?.priceExVat ?? null);
  assert.equal(patch?.status, "live");
  assert.equal(patch?.monthly_amount, 79);
  assert.equal(patch?.started_at, "2026-09-22");
  assert.equal(recurringLivePatch({ ...pending, status: "live" }, "2026-10-01", 49.5), null);
});

test("akkoord bewaart €79 en MRR telt alleen dat actieve tarief", async () => {
  await withIsolatedStore(async () => {
    const hosting = getProduct("hosting");
    const website = getProduct("website_standard");
    assert.ok(hosting && website);
    const draft: ProposalDraftInput = {
      title: "Voorstel voor Noordkaap",
      intro: "Website en hosting.",
      aanleiding: "Nieuwe site.",
      scopeSummary: "Maatwerkwebsite met hosting",
      planning: "Vier weken",
      validityText: "14 dagen",
      recipientName: "Mila Noord",
      recipientEmail: "mila@noordkaap.nl",
      recipientOrganization: "Noordkaap",
      type: "maatwerk",
      lines: [
        proposalLineFromProduct(website),
        proposalLineFromProduct(hosting, { unitPriceExVat: 79 }),
      ],
    };
    const created = await createProposal({
      type: "maatwerk",
      recipientName: draft.recipientName,
      recipientEmail: draft.recipientEmail,
      recipientOrganization: draft.recipientOrganization,
      createdBy: "contact@kopvast.nl",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const sent = await sendProposal(created.id, draft, "contact@kopvast.nl");
    assert.equal(sent.ok, true);
    const detail = await loadProposal(created.id);
    const token = detail?.proposal.current_token;
    assert.ok(token);
    const accepted = await acceptProposal(token!, {
      name: "Mila Noord",
      email: "mila@noordkaap.nl",
      acceptedTerms: true,
    });
    assert.equal(accepted.ok, true);

    const beforeLive = await readStore();
    const service = beforeLive.projects.find((item) => item.type === "hosting");
    assert.ok(service);
    assert.equal(service?.status, "voorbereiding");
    assert.equal(service?.monthly_amount, 79);
    assert.equal(beforeLive.projects.some((item) => item.type === "beheer"), false);
    assert.equal(beforeLive.orders[0]?.recurring_price_amount, 79);
    assert.equal(getProduct("hosting")?.priceExVat, 49.5);
    const pendingSummary = beheerSummary(
      buildBeheerCatalog(beforeLive.organizations, beforeLive.projects, [])
    );
    assert.equal(pendingSummary.mrr, 0);

    await activateRecurringForOrganization(service!.organization_id, "2026-09-22T12:00:00.000Z");
    const afterLive = await readStore();
    const active = afterLive.projects.find((item) => item.id === service?.id);
    assert.equal(active?.status, "live");
    assert.equal(active?.monthly_amount, 79);
    assert.equal(afterLive.orders[0]?.recurring_price_amount, 79);
    const billing = afterLive.recurring.find((item) => item.project_id === active?.id);
    assert.equal(billing?.monthly_amount, 79);
    assert.equal(billing?.active, true);
    assert.equal(billing?.start_date, "2026-09-22");
    const summary = beheerSummary(buildBeheerCatalog(afterLive.organizations, afterLive.projects, []));
    assert.equal(summary.hostingCount, 1);
    assert.equal(summary.hostingPlusCount, 0);
    assert.equal(summary.beheerCount, 0);
    assert.equal(summary.mrr, 79);
  });
});
