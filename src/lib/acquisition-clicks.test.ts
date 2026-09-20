import assert from "node:assert/strict";
import test from "node:test";
import {
  choiceClickLabel,
  clickActivityLabel,
  clickResponseStatus,
  ensureAcquisitionClickLinks,
  isClickPrefetch,
  isTrackingUrl,
  isValidClickToken,
  recordAcquisitionClick,
  resetAcquisitionClickStoreForTests,
  tokenFromTrackingUrl,
  trackingUrlForToken,
} from "./acquisition-clicks";

test("prefetch van mailscanners telt niet als echte klik", () => {
  assert.equal(isClickPrefetch({ method: "HEAD" }), true);
  assert.equal(isClickPrefetch({ method: "GET", userAgent: "Mozilla/5.0" }), false);
  assert.equal(isClickPrefetch({ method: "GET", userAgent: "Microsoft Office Excel 2013" }), true);
  assert.equal(isClickPrefetch({ method: "GET", userAgent: "Proofpoint URL Defense" }), true);
});

test("kliklabels zijn leesbaar in admin en mail", () => {
  assert.equal(choiceClickLabel("voorstel"), "Ja, doe me een voorstel");
  assert.equal(choiceClickLabel("info"), "Stuur me eerst meer info");
  assert.equal(clickActivityLabel("voorstel"), "Geklikt op voorstel");
  assert.equal(clickResponseStatus("voorstel"), "POSITIVE");
  assert.equal(clickResponseStatus("info"), "QUESTION");
});

test("maakt volgbare /r/-links en houdt de startpagina als bestemming", async () => {
  await resetAcquisitionClickStoreForTests();
  const links = await ensureAcquisitionClickLinks({
    prospectId: "prospect-fluweel",
    mailId: "mail-1",
    domain: "fluweelevents.nl",
    companyName: "Fluweel Events",
    body: "Een complete Kopvast Website kost normaal €1.495 excl. btw. Voor jullie maak ik daar €995 excl. btw. van.",
  });
  assert.equal(isTrackingUrl(links.choiceAUrl), true);
  assert.equal(isTrackingUrl(links.choiceBUrl), true);
  const token = tokenFromTrackingUrl(links.choiceAUrl);
  assert.equal(isValidClickToken(token ?? ""), true);
  assert.equal(trackingUrlForToken(token ?? "").includes("/r/"), true);

  const again = await ensureAcquisitionClickLinks({
    prospectId: "prospect-fluweel",
    mailId: "mail-1",
    domain: "fluweelevents.nl",
    companyName: "Fluweel Events",
    choiceAUrl: links.choiceAUrl,
    choiceBUrl: links.choiceBUrl,
  });
  assert.equal(again.choiceAUrl, links.choiceAUrl);
  assert.equal(again.choiceBUrl, links.choiceBUrl);
});

test("eerste echte klik wordt vastgelegd, tweede klik mailt niet opnieuw", async () => {
  await resetAcquisitionClickStoreForTests();
  const links = await ensureAcquisitionClickLinks({
    prospectId: "prospect-nova",
    mailId: "mail-2",
    domain: "nova-advies.nl",
  });
  const token = tokenFromTrackingUrl(links.choiceAUrl);
  assert.ok(token);

  const prefetch = await recordAcquisitionClick({
    token,
    method: "GET",
    userAgent: "Proofpoint URL Defense",
  });
  assert.equal(prefetch.recorded, false);
  assert.equal(prefetch.notified, false);
  assert.match(prefetch.destination, /\/start\?keuze=voorstel/);

  const first = await recordAcquisitionClick({ token, method: "GET", userAgent: "Mozilla/5.0" });
  assert.equal(first.recorded, true);
  assert.match(first.destination, /nova-advies.nl/);
  assert.equal(first.link?.clickCount, 1);

  const second = await recordAcquisitionClick({ token, method: "GET", userAgent: "Mozilla/5.0" });
  assert.equal(second.recorded, true);
  assert.equal(second.notified, false);
  assert.equal(second.link?.clickCount, 2);
});
