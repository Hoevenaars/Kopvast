import assert from "node:assert/strict";
import test from "node:test";
import { buildAutoFollowUpBody } from "./acquisition/follow-up";
import { fallbackAcquisitionMail } from "./acquisition-mail";
import {
  companyDomainFromEmail,
  decideCompanyWebsite,
  greetingForContact,
  knownFirstName,
  parseFacebookUrl,
  parseProspectProfile,
  plannedProspectDomain,
  prospectIdentityForProfile,
  splitLegacyContactName,
} from "./prospect-profile";

test("gmail is een contactadres en nooit het bedrijfsdomein", () => {
  const profile = parseProspectProfile({
    firstName: "Jan",
    lastName: "Bakker",
    email: "Jan.Bakker@Gmail.com",
    phone: "06 12 34 56 78",
    facebookUrl: "facebook.com/bakkerijjan",
    socialUrl: "https://www.instagram.com/bakkerijjan",
    city: "Groesbeek",
    notes: "Staat op de weekmarkt.",
  });
  assert.equal(profile.ok, true);
  if (!profile.ok) return;
  assert.equal(profile.profile.email, "jan.bakker@gmail.com");
  assert.equal(profile.profile.phone, "0612345678");
  assert.equal(profile.profile.firstName, "Jan");
  assert.equal(profile.profile.lastName, "Bakker");
  assert.equal(profile.profile.facebookUrl, "https://www.facebook.com/bakkerijjan");
  assert.equal(profile.profile.socialUrl, "https://www.instagram.com/bakkerijjan");
  assert.equal(companyDomainFromEmail(profile.profile.email), null);
  const identity = prospectIdentityForProfile({
    email: profile.profile.email,
    phone: profile.profile.phone,
    company: "Bakkerij Jan",
  });
  assert.equal(identity, "jan.bakker@gmail.com|bakkerij jan");
  assert.equal(identity.startsWith("gmail.com"), false);
  assert.notEqual(prospectIdentityForProfile({ email: "piet@gmail.com", company: "Bakkerij Jan" }), identity);
});

test("een prospect zonder bekende contactpersoon blijft geldig", () => {
  const profile = parseProspectProfile({ email: "", phone: "", firstName: "", lastName: "" });
  assert.equal(profile.ok, true);
  if (!profile.ok) return;
  assert.equal(profile.profile.contactName, null);
  assert.equal(greetingForContact(knownFirstName(profile.profile)), "Goedendag,");
  assert.equal(prospectIdentityForProfile({ company: "Atelier Noord" }), "|atelier noord");
});

test("facebook en gmail.com starten geen websitescan en leveren geen domein", () => {
  for (const value of ["https://www.facebook.com/bakkerijjan", "fb.com/bakkerij", "gmail.com", "jan@gmail.com"]) {
    const decision = decideCompanyWebsite(value);
    assert.equal(decision.scan, false);
    assert.equal(decision.action, "reject");
  }
  const absent = plannedProspectDomain({ hasWebsite: false, email: "jan@gmail.com", website: "https://facebook.com/bakkerijjan" });
  assert.equal(absent.domain, null);
  assert.equal(absent.scan, false);
  const facebookAsSite = plannedProspectDomain({ hasWebsite: true, website: "https://facebook.com/bakkerijjan", email: "jan@gmail.com" });
  assert.equal(facebookAsSite.domain, null);
  assert.equal(facebookAsSite.scan, false);
  const real = plannedProspectDomain({ hasWebsite: true, website: "https://www.bakkerijjan.nl", email: "jan@gmail.com" });
  assert.equal(real.domain, "bakkerijjan.nl");
  assert.equal(real.scan, true);
  assert.notEqual(real.domain, "gmail.com");
});

test("een bestaande contact_name blijft leesbaar als voor- en achternaam", () => {
  assert.deepEqual(splitLegacyContactName("Jan de Vries"), { firstName: "Jan", lastName: "de Vries" });
  assert.equal(knownFirstName({ contactName: "Jan de Vries" }), "Jan");
  assert.equal(parseFacebookUrl("").ok, true);
});

test("de eerste mail gebruikt de voornaam en noemt zonder website geen prijs", () => {
  const named = fallbackAcquisitionMail({
    companyName: "Bakkerij Jan",
    domain: "",
    fit: "REVIEW_REQUIRED",
    findings: [],
    websitePresence: "NO_WEBSITE",
    greeting: greetingForContact("Jan"),
  });
  assert.match(named.body, /^Hoi Jan,/);
  assert.doesNotMatch(named.body, /€|995|1[.,]495|lighthouse|opportunity score/i);
  const neutral = fallbackAcquisitionMail({
    companyName: "Bakkerij Jan",
    domain: "",
    fit: "REVIEW_REQUIRED",
    findings: [],
    websitePresence: "NO_WEBSITE",
    greeting: greetingForContact(null),
  });
  assert.match(neutral.body, /^Goedendag,/);
  const followUp = buildAutoFollowUpBody({
    domain: "Bakkerij Jan",
    companyName: "Bakkerij Jan",
    fit: "REVIEW_REQUIRED",
    websitePresence: "NO_WEBSITE",
    greeting: greetingForContact("Jan"),
  });
  assert.match(followUp, /^Hoi Jan,/);
  assert.doesNotMatch(followUp, /€|995|1[.,]495/);
  assert.match(followUp, /sterke online presentatie/);
});
