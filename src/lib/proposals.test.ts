import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { render } from "react-email";
import { ProposalEmail } from "../emails/proposal";
import { proposalMailCopy } from "../emails/proposal-copy";
import {
  canAcceptProposal,
  evaluateProposalSend,
  formatEuro,
  formatProposalNumber,
  hasUnsentDraftChanges,
  nextProposalNumber,
  parseMoneyToCents,
  parseQuantity,
  projectsFromSnapshot,
  snapshotContent,
  totalsFromLines,
} from "./proposals";
import { termsPlainText, VAT_RATE } from "./terms";

test("nummering volgt KOP-jaar-volgnummer", () => {
  assert.equal(formatProposalNumber(2026, 12), "KOP-2026-0012");
  assert.equal(nextProposalNumber(["KOP-2026-0012", "KOP-2025-0099"], new Date("2026-09-16")), "KOP-2026-0013");
  assert.equal(nextProposalNumber([], new Date("2026-01-01")), "KOP-2026-0001");
});

test("parst Nederlandse bedragen naar centen", () => {
  assert.equal(parseMoneyToCents("1.495,50"), 149550);
  assert.equal(parseMoneyToCents("€ 1495"), 149500);
  assert.equal(parseMoneyToCents("199,00"), 19900);
  assert.equal(parseMoneyToCents("-10"), null);
  assert.equal(parseQuantity("1,5"), 1.5);
  assert.match(formatEuro(149500), /1\.495,00/);
});

test("berekent btw over eenmalig en maandelijks apart", () => {
  const totals = totalsFromLines([
    { kind: "scope", quantity: 1, unitPriceCents: 480000 },
    { kind: "recurring", quantity: 1, unitPriceCents: 19900 },
  ]);
  assert.equal(totals.subtotalCents, 480000);
  assert.equal(totals.vatRate, VAT_RATE);
  assert.equal(totals.vatCents, Math.round(480000 * 0.21));
  assert.equal(totals.totalCents, 480000 + totals.vatCents);
  assert.equal(totals.recurringMonthlyCents, 19900);
  assert.equal(totals.recurringVatCents, Math.round(19900 * 0.21));
});

test("verzenden vereist e-mail, scope en geldig bedrag", () => {
  const ok = evaluateProposalSend({
    email: "eva@ardea.studio",
    lines: [{ kind: "scope", title: "Website", description: "", quantity: 1, unitPriceCents: 149500 }],
  });
  assert.deepEqual(ok, []);
  assert.match(evaluateProposalSend({ email: "geen-mail", lines: [] })[0], /e-mail/);
  assert.match(
    evaluateProposalSend({
      email: "eva@ardea.studio",
      lines: [{ kind: "scope", title: "Website", description: "", quantity: 1, unitPriceCents: 0 }],
    })[0],
    /bedrag/
  );
});

test("nieuwe versie ontstaat pas bij inhoudelijke wijziging", () => {
  const sent = snapshotContent({
    number: "KOP-2026-0012",
    version: 1,
    type: "maatwerk",
    title: "Voorstel voor Ardea",
    intro: "Intro",
    aanleiding: "Aanleiding",
    scopeSummary: "Website",
    planning: "3-5 weken",
    validity: "Alleen deze versie.",
    organization: "Ardea",
    recipientName: "Eva",
    recipientEmail: "eva@ardea.studio",
    lines: [{ kind: "scope", title: "Website", description: "", quantity: 1, unitPriceCents: 480000 }],
    sentAt: "2026-09-16T10:00:00.000Z",
  });
  const same = snapshotContent({ ...sent, version: 1, sentAt: "2026-09-16T12:00:00.000Z", terms: sent.terms });
  assert.equal(hasUnsentDraftChanges(same, sent), false);
  assert.equal(hasUnsentDraftChanges({ ...same, intro: "Aangepast" }, sent), true);
});

test("akkoord alleen op de actuele niet-geaccepteerde versie", () => {
  const proposal = { status: "SENT" as const, version: 2 };
  assert.equal(canAcceptProposal({ proposal, version: { version: 2 } }).ok, true);
  assert.equal(canAcceptProposal({ proposal, version: { version: 1 } }).ok, false);
  assert.equal(canAcceptProposal({ proposal: { ...proposal, status: "ACCEPTED" }, version: { version: 2 } }).already, true);
  assert.equal(canAcceptProposal({ proposal: { ...proposal, status: "DRAFT" }, version: { version: 2 } }).ok, false);
});

test("handoff maakt maatwerk- en optioneel beheerproject uit de snapshot", () => {
  const snapshot = snapshotContent({
    number: "KOP-2026-0012",
    version: 2,
    type: "maatwerk",
    title: "Voorstel voor Ardea",
    intro: "",
    aanleiding: "",
    scopeSummary: "Portaal",
    planning: "",
    validity: "",
    organization: "Ardea",
    recipientName: "Eva",
    recipientEmail: "eva@ardea.studio",
    lines: [
      { kind: "scope", title: "Klantportaal", description: "", quantity: 1, unitPriceCents: 480000 },
      { kind: "recurring", title: "Kopvast Beheer", description: "", quantity: 1, unitPriceCents: 19900 },
    ],
    sentAt: "2026-09-16T10:00:00.000Z",
  });
  const projects = projectsFromSnapshot(snapshot);
  assert.equal(projects.length, 2);
  assert.equal(projects[0]?.type, "maatwerk");
  assert.match(projects[0]?.price_label ?? "", /4.800/);
  assert.equal(projects[1]?.type, "beheer");
  assert.match(projects[1]?.price_label ?? "", /199/);
});

test("voorstelvoorwaarden hergebruiken de bestaande werkwijze", () => {
  const text = termsPlainText();
  assert.match(text, /50% bij opdrachtbevestiging/);
  assert.match(text, /Stilte is geen publicatiegoedkeuring/);
  assert.doesNotMatch(text, /14 dagen/);
});

test("voorstelmail noemt de organisatie en de link", async () => {
  const copy = proposalMailCopy({ organization: "Ardea" });
  assert.equal(copy.subject, "Voorstel van Kopvast voor Ardea");
  const html = await render(
    createElement(ProposalEmail, {
      name: "Eva",
      organization: "Ardea",
      url: "https://kopvast.nl/voorstel/abc",
      amount: "€ 4.800,00",
    })
  );
  assert.match(html, /Bekijk het voorstel/);
  assert.match(html, /https:\/\/kopvast.nl\/voorstel\/abc/);
});
