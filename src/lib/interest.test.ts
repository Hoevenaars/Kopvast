import assert from "node:assert/strict";
import test from "node:test";
import { NEXT_ACTIONS } from "./commercial";
import { mapInboundLead } from "./inbound";
import {
  bindingPriceFromPublicQuery,
  publicInterestNextAction,
  requestTypeForInterest,
  stripUntrustedCommercialFields,
  summarizeRequests,
} from "./interest";
test("een publieke prijsparameter is nooit een bindende prijs", () => {
  assert.equal(bindingPriceFromPublicQuery("1"), null);
  assert.equal(bindingPriceFromPublicQuery("995"), null);
  assert.equal(bindingPriceFromPublicQuery("1495"), null);
  assert.equal(bindingPriceFromPublicQuery("€1"), null);
  const details = stripUntrustedCommercialFields({
    Prijs: "€1 excl. btw",
    Startbevestiging: "Ik wil starten voor €1",
    price: "995",
    Dienst: "automatisering",
    Toelichting: "Koppeling",
  });
  assert.equal(details.Prijs, undefined);
  assert.equal(details.Startbevestiging, undefined);
  assert.equal(details.price, undefined);
  assert.equal(details.Dienst, "automatisering");
  const internals = stripUntrustedCommercialFields({ "$ACTION_KEY": "geheim", Dienst: "website-nieuw" });
  assert.equal(internals.$ACTION_KEY, undefined);
  assert.equal(internals.Dienst, "website-nieuw");
});

test("automatisering wordt geen standaard websiteaanvraag", () => {
  assert.equal(requestTypeForInterest("interesse", "automatisering"), "maatwerk");
  assert.equal(requestTypeForInterest("interesse", "website-nieuw"), "website");
  assert.equal(requestTypeForInterest("website-aanvraag"), "website");
  const row = mapInboundLead({
    id: "lead-auto",
    name: "Eva",
    email: "eva@example.com",
    company: "Ardea",
    website: "",
    message: "Facturen twee keer invoeren",
    source: "interesse",
    phone: "",
    details: {
      Dienst: "automatisering",
      Prijs: "€1",
      Toelichting: "Facturen twee keer invoeren",
      Landing: "/automatisering",
      CTA: "automatisering",
    },
  });
  assert.equal(row.type, "maatwerk");
  assert.equal(row.status, "MAATWERK_REVIEW");
  assert.equal(row.product_fit, "CUSTOM_FIT");
  assert.equal(row.payload.dienst, "automatisering");
  assert.equal(row.payload.has_website, "nee");
  assert.equal(row.next_action, NEXT_ACTIONS.CALL_CLIENT);
  assert.equal(row.consent, false);
  assert.equal(row.payload.consent, false);
  assert.equal(JSON.stringify(row.payload).includes("€1"), false);
  assert.match(String(row.request_detail), /Automatisering/);
});

test("een voorstelvraag uit acquisitie blijft een voorstelactie, geen order", () => {
  assert.equal(publicInterestNextAction({ source: "acquisitie-voorstel" }), NEXT_ACTIONS.MAKE_PROPOSAL);
  assert.equal(publicInterestNextAction({ source: "interesse", subject: "website-nieuw" }), NEXT_ACTIONS.CALL_CLIENT);
  const row = mapInboundLead({
    id: "lead-proposal",
    name: "Eva",
    email: "eva@example.com",
    company: "Fluweel",
    website: "fluweel.nl",
    message: "Graag een richting",
    source: "acquisitie-voorstel",
    phone: "",
    details: { Dienst: "website-vernieuwen" },
  });
  assert.equal(row.type, "website");
  assert.equal(row.next_action, NEXT_ACTIONS.MAKE_PROPOSAL);
  assert.equal(row.consent, false);
  assert.equal(row.payload.has_website, "ja");
});

test("samenvatting telt alleen echte aanvragen", () => {
  const summary = summarizeRequests([
    { source: "interesse", type: "maatwerk", proposal_status: "SENT", payload: { dienst: "automatisering" } },
    { source: "interesse", type: "website", proposal_status: "ACCEPTED", payload: { dienst: "website-nieuw" } },
    { source: "maatwerk", type: "maatwerk", proposal_status: null, payload: {} },
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.bySubject.automatisering, 1);
  assert.equal(summary.bySource.interesse, 2);
  assert.equal(summary.proposals, 2);
  assert.equal(summary.accepted, 1);
});
