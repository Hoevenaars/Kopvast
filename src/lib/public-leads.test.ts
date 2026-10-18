import assert from "node:assert/strict";
import test from "node:test";
import { requestActionFromRow } from "./aanvragen";
import { mapInboundLead } from "./inbound";
import { createLead, publicLeadIdempotencyKey, resetMemoryLeadStoreForTests, setLeadSaveForTests } from "./leads";

const base = {
  name: "Eva Linden",
  email: "eva@example.com",
  company: "Bakkerij De Horst",
  message: "We willen graag kennismaken.",
  idempotencyKey: "retry-key-eva-horst-01",
};

function useMemoryStore() {
  process.env.KOPVAST_LEAD_STORE = "memory";
  resetMemoryLeadStoreForTests();
}

test("zonder database is een aanvraag geen succes", async () => {
  const previous = process.env.KOPVAST_LEAD_STORE;
  delete process.env.KOPVAST_LEAD_STORE;
  delete process.env.WEBSITE_REFRESH_SUPABASE_URL;
  delete process.env.WEBSITE_REFRESH_SERVICE_ROLE_KEY;
  const result = await createLead({ ...base, source: "interesse", details: { Dienst: "website-nieuw" } });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /opslaan lukt nu niet/);
  if (previous === undefined) delete process.env.KOPVAST_LEAD_STORE;
  else process.env.KOPVAST_LEAD_STORE = previous;
});

test("dubbele submit en retry gebruiken dezelfde aanvraag", async () => {
  const previous = process.env.KOPVAST_LEAD_STORE;
  useMemoryStore();
  try {
    const first = await createLead({ ...base, source: "interesse", website: "", details: { Dienst: "website-nieuw" } });
    const second = await createLead({ ...base, source: "interesse", website: "", details: { Dienst: "website-nieuw" } });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(second.duplicate, true);
      assert.equal(second.id, first.id);
      assert.equal(second.emailed, false);
    }
    const key = publicLeadIdempotencyKey({
      clientKey: base.idempotencyKey,
      email: base.email,
      source: "interesse",
      company: base.company,
      website: "",
      message: base.message,
    });
    assert.equal(key, `client:${base.idempotencyKey}`);
  } finally {
    resetMemoryLeadStoreForTests();
    if (previous === undefined) delete process.env.KOPVAST_LEAD_STORE;
    else process.env.KOPVAST_LEAD_STORE = previous;
  }
});

test("een mislukte insert wordt niet als succes bevestigd en een retry daarna wel", async () => {
  const saved: string[] = [];
  setLeadSaveForTests(async () => ({ ok: false, message: "Aanvraag opslaan lukt nu niet. Probeer het zo opnieuw." }));
  const failed = await createLead({ ...base, source: "interesse", details: { Dienst: "automatisering" } });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.match(failed.message, /opslaan lukt nu niet/);
  assert.equal(saved.length, 0);

  setLeadSaveForTests(async (lead, key) => {
    if (saved.includes(key)) return { ok: true, id: saved[0] ? "lead-db-1" : lead.id, duplicate: true };
    saved.push(key);
    return { ok: true, id: "lead-db-1", duplicate: false };
  });
  const stored = await createLead({ ...base, source: "interesse", details: { Dienst: "automatisering" } });
  const retry = await createLead({ ...base, source: "interesse", details: { Dienst: "automatisering" } });
  assert.equal(stored.ok, true);
  assert.equal(retry.ok, true);
  if (stored.ok && retry.ok) {
    assert.equal(retry.duplicate, true);
    assert.equal(retry.id, stored.id);
  }
  assert.equal(saved.length, 1);
  setLeadSaveForTests(null);
});

test("aanvraag zonder website en automatisering krijgen een next action voor Today", () => {
  const withoutSite = mapInboundLead({
    id: "lead-zonder-site",
    name: "Eva",
    email: "eva@example.com",
    company: "Bakkerij De Horst",
    website: "",
    message: "Laat eens zien wat je in gedachten hebt.",
    source: "interesse",
    phone: "",
    details: { Dienst: "website-nieuw", Toelichting: "Laat eens zien wat je in gedachten hebt." },
  });
  assert.equal(withoutSite.website, null);
  assert.equal(withoutSite.type, "website");
  assert.equal(withoutSite.payload.has_website, "nee");
  assert.equal(withoutSite.next_action, "Klant bellen");
  assert.ok(withoutSite.next_action_at);

  const automation = mapInboundLead({
    id: "lead-ai",
    name: "Eva",
    email: "eva@example.com",
    company: "Bakkerij De Horst",
    website: "",
    message: "Aanvragen zetten we nog met de hand over.",
    source: "interesse",
    phone: "",
    details: { Dienst: "automatisering" },
  });
  assert.equal(automation.type, "maatwerk");
  assert.equal(automation.product_fit, "CUSTOM_FIT");
  assert.equal(automation.payload.dienst, "automatisering");
  assert.equal(automation.next_action, "Klant bellen");

  const today = requestActionFromRow({
    id: "lead-ai",
    company_name: automation.company_name,
    name: automation.name,
    next_action: automation.next_action ?? null,
    next_action_at: automation.next_action_at ?? null,
  });
  assert.equal(today.title, "Klant bellen");
  assert.equal(today.company, "Bakkerij De Horst");
  assert.equal(today.status, "Actie nodig");
  assert.match(today.href, /lead-ai/);
});
