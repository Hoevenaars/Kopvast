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
  startConfirmLabel,
  startLandingCopy,
} from "./acquisition-start";

test("keuze uit de mail wordt een startpagina, geen brochure", () => {
  assert.equal(DEFAULT_CHOICE_A_URL, "https://kopvast.nl/start?keuze=voorstel");
  assert.equal(DEFAULT_CHOICE_B_URL, "https://kopvast.nl/start?keuze=info");
  assert.match(DEFAULT_CHOICE_A_URL, new RegExp(ACQUISITION_START_PATH));
  assert.doesNotMatch(DEFAULT_CHOICE_A_URL, /werkwijze/);
  assert.doesNotMatch(DEFAULT_CHOICE_B_URL, /\/websites/);
});

test("persoonlijke start-urls nemen website, bedrijf en prijs mee", () => {
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
  assert.equal(proposal.searchParams.get("prijs"), "995");
  assert.equal(info.searchParams.get("keuze"), "info");
  assert.equal(info.searchParams.get("website"), "fluweelevents.nl");
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
    offerPrice: 995,
  });
  assert.equal(parseStartSearchParams({ website: "javascript:alert(1)" }).website, "");
  assert.equal(parseStartSearchParams({ keuze: ["info", "voorstel"], prijs: ["995"] }).choice, "info");
  assert.equal(parseStartSearchParams({ keuze: ["info", "voorstel"], prijs: ["995"] }).offerPrice, 995);
});

test("startkopij is meteen een koop, geen extra rondje website", () => {
  const proposal = startLandingCopy({
    choice: "voorstel",
    website: "fluweelevents.nl",
    company: "Fluweel Events",
    offerPrice: 995,
  });
  assert.match(proposal.title, /Fluweel Events/);
  assert.match(proposal.text, /€995/);
  assert.equal(proposal.submitLabel, "Start Kopvast Website");
  assert.equal(formatOfferPrice(995), "€995");
  assert.equal(startConfirmLabel(1495), "Ik wil starten met Kopvast Website voor €1.495 excl. btw.");

  const info = startLandingCopy({
    choice: "info",
    website: "",
    company: "",
    offerPrice: 1495,
  });
  assert.match(info.title, /meteen starten/);
  assert.match(info.text, /€1.495/);
});

test("aanvraagbron blijft herkenbaar in admin en mail", () => {
  assert.equal(acquisitionSource("voorstel"), ACQUISITION_PROPOSAL_SOURCE);
  assert.equal(acquisitionSource("info"), ACQUISITION_INFO_SOURCE);
  assert.equal(isAcquisitionStartSource(ACQUISITION_PROPOSAL_SOURCE), true);
  assert.equal(isAcquisitionStartSource("website-aanvraag"), false);
});
