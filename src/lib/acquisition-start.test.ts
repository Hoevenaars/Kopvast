import assert from "node:assert/strict";
import test from "node:test";
import {
  ACQUISITION_INFO_SOURCE,
  ACQUISITION_PROPOSAL_SOURCE,
  ACQUISITION_START_PATH,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  acquisitionChoiceUrls,
  acquisitionSource,
  formatOfferPrice,
  isAcquisitionStartSource,
  explicitOfferPriceInText,
  offerPriceFromParagraph,
  parseAcquisitionChoice,
  parseCompanyParam,
  parseOfferPrice,
  parseStartSearchParams,
  startLandingCopy,
} from "./acquisition-start";
import { bindingPriceFromPublicQuery } from "./interest";

test("keuze uit de mail wordt een startpagina, geen brochure", () => {
  assert.equal(DEFAULT_CHOICE_A_URL, "https://kopvast.nl/start?keuze=voorstel");
  assert.equal(DEFAULT_CHOICE_B_URL, "https://kopvast.nl/start?keuze=info");
  assert.match(DEFAULT_CHOICE_A_URL, new RegExp(ACQUISITION_START_PATH));
  assert.doesNotMatch(DEFAULT_CHOICE_A_URL, /werkwijze/);
  assert.doesNotMatch(DEFAULT_CHOICE_B_URL, /\/websites/);
});

test("persoonlijke start-urls nemen website en bedrijf mee, geen prijs", () => {
  const urls = acquisitionChoiceUrls({
    domain: "https://www.FluweelEvents.nl/home",
    companyName: "Fluweel Events",
    offerPrice: 995,
  });
  const proposal = new URL(urls.choiceAUrl);
  const info = new URL(urls.choiceBUrl);
  assert.equal(proposal.pathname, "/start");
  assert.equal(proposal.searchParams.get("keuze"), "voorstel");
  assert.equal(proposal.searchParams.get("website"), "fluweelevents.nl");
  assert.equal(proposal.searchParams.get("bedrijf"), "Fluweel Events");
  assert.equal(proposal.searchParams.get("prijs"), null);
  assert.equal(info.searchParams.get("keuze"), "info");
  assert.equal(info.searchParams.get("website"), "fluweelevents.nl");
  assert.doesNotMatch(urls.choiceAUrl, /prijs=/);
});

test("parst startquery veilig", () => {
  assert.equal(parseAcquisitionChoice("meer info"), "info");
  assert.equal(parseAcquisitionChoice("voorstel"), "voorstel");
  assert.equal(parseAcquisitionChoice("onbekend"), "voorstel");
  assert.equal(parseCompanyParam("  Fluweel <b>Events</b>  "), "Fluweel Events");
  assert.equal(parseCompanyParam("x".repeat(200)).length, 120);
  assert.equal(parseOfferPrice("€995"), 995);
  assert.equal(parseOfferPrice("1495"), 1495);
  assert.equal(parseOfferPrice("abc"), 1495);
  assert.equal(offerPriceFromParagraph("Voor jullie maak ik daar €995 excl. btw. van."), 995);
  assert.equal(offerPriceFromParagraph("Een complete Kopvast Website kost €1.495 excl. btw."), 1495);
  assert.equal(explicitOfferPriceInText("Voor jullie maak ik daar €995 excl. btw. van."), 995);
  assert.equal(explicitOfferPriceInText("Een complete Kopvast Website kost €1.495 excl. btw."), 1495);
  assert.equal(explicitOfferPriceInText("Alleen een observatie, zonder prijs."), null);

  const parsed = parseStartSearchParams({
    keuze: "info",
    website: "https://www.fluweelevents.nl",
    bedrijf: "Fluweel Events",
    prijs: "995",
  });
  assert.deepEqual(parsed, {
    choice: "info",
    website: "fluweelevents.nl",
    company: "Fluweel Events",
  });
  assert.equal(parseStartSearchParams({ website: "javascript:alert(1)" }).website, "");
  assert.equal(parseStartSearchParams({ keuze: ["info", "voorstel"], prijs: ["1"] }).choice, "info");
  assert.equal(bindingPriceFromPublicQuery("1"), null);
  assert.equal(bindingPriceFromPublicQuery("995"), null);
});

test("startkopij is interesse, geen koop en geen url-prijs", () => {
  const proposal = startLandingCopy({
    choice: "voorstel",
    website: "fluweelevents.nl",
    company: "Fluweel Events",
  });
  assert.match(proposal.title, /Fluweel Events/);
  assert.doesNotMatch(proposal.text, /€|excl\. btw|starten met Kopvast Website/);
  assert.match(proposal.text, /geen akkoord/);
  assert.equal(proposal.submitLabel, "Vraag een voorstel aan");
  assert.equal(formatOfferPrice(995), "€995");

  const info = startLandingCopy({
    choice: "info",
    website: "",
    company: "",
  });
  assert.match(info.title, /zonder verplichting/);
  assert.doesNotMatch(`${info.title} ${info.text}`, /€/);
});

test("aanvraagbron blijft herkenbaar in admin en mail", () => {
  assert.equal(acquisitionSource("voorstel"), ACQUISITION_PROPOSAL_SOURCE);
  assert.equal(acquisitionSource("info"), ACQUISITION_INFO_SOURCE);
  assert.equal(isAcquisitionStartSource(ACQUISITION_PROPOSAL_SOURCE), true);
  assert.equal(isAcquisitionStartSource("website-aanvraag"), false);
});
