import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { render } from "react-email";
import { LoginLinkEmail } from "../emails/login-link";
import { PasswordResetEmail } from "../emails/password-reset";
import { createLoginCode, createToken, formatLoginCode, hashLoginCode, hashToken, isLoginCode, normalizeLoginCode } from "./tokens";
import {
  defaultProjectsForLead,
  mapLeadToOrganization,
  parseRequestInput,
} from "./workspace";
import {
  destinationForRole,
  isAdminEmail,
  memberHasAccess,
  isEmail,
  labelFor,
  leadStatuses,
  normalizeEmail,
  projectStatuses,
} from "./product";

test("normaliseert e-mail en herkent admin-domein", () => {
  assert.equal(normalizeEmail("  Contact@Kopvast.nl "), "contact@kopvast.nl");
  assert.equal(isEmail("contact@kopvast.nl"), true);
  assert.equal(isEmail("fout"), false);
  assert.equal(isAdminEmail("contact@kopvast.nl"), true);
  assert.equal(isAdminEmail("eva@atelierlint.nl"), false);
  assert.equal(memberHasAccess({ access_enabled: true }), true);
  assert.equal(memberHasAccess({ access_enabled: false }), false);
  assert.equal(memberHasAccess({}), true);
  assert.equal(destinationForRole("admin"), "/admin");
  assert.equal(destinationForRole("customer"), "/klant");
});

test("hash van login-token is deterministisch en niet de token zelf", () => {
  const token = createToken();
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), token);
  assert.notEqual(hashToken(token), hashToken("ander"));
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
});

test("inlogcode is zes cijfers en wordt per e-mail gehashed", () => {
  const code = createLoginCode();
  assert.match(code, /^\d{6}$/);
  assert.equal(isLoginCode("482 917"), true);
  assert.equal(isLoginCode("48291"), false);
  assert.equal(normalizeLoginCode("482 917"), "482917");
  assert.equal(formatLoginCode("482917"), "482 917");
  assert.equal(hashLoginCode("eva@atelierlint.nl", "482 917", "customer"), hashLoginCode("eva@atelierlint.nl", "482917", "customer"));
  assert.notEqual(
    hashLoginCode("eva@atelierlint.nl", "482917", "customer"),
    hashLoginCode("nina@example.com", "482917", "customer")
  );
  assert.notEqual(
    hashLoginCode("eva@atelierlint.nl", "482917", "customer"),
    hashLoginCode("eva@atelierlint.nl", "482917", "admin")
  );
});

test("zet een website-aanvraag om naar klant + standaardprojecten", () => {
  const org = mapLeadToOrganization({
    id: "lead-1",
    name: "Eva Lint",
    company_name: "Atelier Lint",
    website: "atelierlint.nl",
  });
  assert.equal(org.name, "Atelier Lint");
  assert.equal(org.status, "onboarding");
  assert.equal(org.inbound_lead_id, "lead-1");
  const projects = defaultProjectsForLead("website");
  assert.deepEqual(
    projects.map((item) => item.type),
    ["website", "beheer"]
  );
  assert.equal(defaultProjectsForLead("maatwerk")[0]?.type, "maatwerk");
});

test("valideert wijzigingsverzoeken", () => {
  assert.equal(parseRequestInput({ title: "x", body: "te kort" }).ok, false);
  const ok = parseRequestInput({
    type: "wijziging",
    title: "Telefoonnummer",
    body: "Zet het nieuwe nummer op de contactpagina.",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.type, "wijziging");
    assert.equal(ok.title, "Telefoonnummer");
  }
});

test("toont leesbare statuslabels", () => {
  assert.equal(labelFor(projectStatuses, "wacht_op_klant"), "Wacht op jou");
  assert.equal(labelFor(leadStatuses, "OMGEZET"), "Klant");
});

test("loginmail toont een inlogcode in de Kopvast-huisstijl", async () => {
  const html = await render(
    createElement(LoginLinkEmail, {
      email: "eva@atelierlint.nl",
      code: "482917",
      role: "customer",
    })
  );
  assert.match(html, /KOPVAST/);
  assert.match(html, /Mijn Kopvast/i);
  assert.match(html, /482 917/);
  assert.doesNotMatch(html, /verify\?token=/);
  assert.match(html, /#a64d27|rgb\(166,\s*77,\s*39\)/i);
});

test("wachtwoordmail toont een herstelcode in de Kopvast-huisstijl", async () => {
  const html = await render(
    createElement(PasswordResetEmail, {
      email: "eva@atelierlint.nl",
      code: "482917",
    })
  );
  assert.match(html, /KOPVAST/);
  assert.match(html, /wachtwoord/i);
  assert.match(html, /482 917/);
  assert.doesNotMatch(html, /wachtwoord\/nieuw\?token=/);
  assert.match(html, /#a64d27|rgb\(166,\s*77,\s*39\)/i);
});
