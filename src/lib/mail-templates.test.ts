import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPlaceholders,
  defaultAcquisitionMailTemplate,
  defaultMailTemplateValues,
  isMailTemplateKey,
  mailTemplateRecords,
} from "./mail-templates";
import { composeAcquisitionBody } from "./acquisition-mail";
import { notificationsFromActions } from "./notifications";
import { TEST_MAIL_IDEMPOTENCY_WINDOW_MS, testMailIdempotencyKey } from "./acquisition-send";

test("placeholders vullen naam en prijs in", () => {
  assert.equal(applyPlaceholders("Hallo {{name}}", { name: "Eva" }), "Hallo Eva");
  assert.equal(applyPlaceholders("Vanaf {{price}}", { price: "€1.495" }), "Vanaf €1.495");
  assert.equal(applyPlaceholders("Geen", { name: "Eva" }), "Geen");
});

test("onbekende templatekeys worden geweigerd", () => {
  assert.equal(isMailTemplateKey("acquisition"), true);
  assert.equal(isMailTemplateKey("niet-bestaand"), false);
});

test("opgeslagen velden overschrijven alleen bekende defaults", () => {
  const records = mailTemplateRecords({
    confirm_website: { subject: "Aangepast onderwerp", extra: "negeren" },
  });
  const website = records.find((item) => item.key === "confirm_website");
  assert.equal(website?.values.subject, "Aangepast onderwerp");
  assert.equal(website?.values.extra, undefined);
  assert.ok((website?.values.text ?? "").length > 10);
});

test("acquisitietemplate houdt de standaardaanhef en prijs", () => {
  const template = defaultAcquisitionMailTemplate();
  assert.match(template.greeting, /Goedendag/);
  assert.match(template.offerStandard, /\{\{price\}\}/);
  const body = composeAcquisitionBody(
    {
      domain: "nova-advies.nl",
      fit: "STANDARD_FIT",
      findings: [],
    },
    { ...template, greeting: "Beste ondernemer," }
  );
  assert.match(body, /Beste ondernemer/);
  assert.match(body, /€1.495|1.495/);
});

test("standaardtemplates bevatten bevestiging en acquisitie", () => {
  const values = defaultMailTemplateValues();
  assert.ok(values.confirm_website.subject);
  assert.ok(values.confirm_maatwerk.subject);
  assert.ok(values.acquisition.opening);
});

test("acquisitietemplate toont alleen velden die de brief nog gebruikt", () => {
  const acquisition = mailTemplateRecords().find((item) => item.key === "acquisition");
  const ids = (acquisition?.fields ?? []).map((field) => field.id);
  assert.deepEqual(ids, ["greeting", "signatureName", "signatureTagline", "offerCustom"]);
  assert.match(acquisition?.help ?? "", /spelregels persoonlijke benadering/);
});

test("testmail-idempotency blijft gelijk binnen het venster", () => {
  const start = 1_000_000;
  assert.equal(testMailIdempotencyKey("mail-1", start), testMailIdempotencyKey("mail-1", start + 1_000));
  assert.notEqual(
    testMailIdempotencyKey("mail-1", start),
    testMailIdempotencyKey("mail-1", start + TEST_MAIL_IDEMPOTENCY_WINDOW_MS)
  );
});

test("dashboardacties worden meldingen", () => {
  const items = notificationsFromActions([
    { title: "Mail bounced", company: "Nova", status: "Actie nodig", age: "2u", href: "/admin/acquisitie/1" },
  ]);
  assert.equal(items[0]?.title, "Mail bounced");
  assert.match(items[0]?.detail ?? "", /Nova/);
});
